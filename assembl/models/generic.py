from datetime import datetime
import logging
from abc import abstractmethod
import re

from sqlalchemy import (
    Column,
    Integer,
    SmallInteger,
    Boolean,
    UnicodeText,
    String,
    Unicode,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import relationship, backref, aliased
from virtuoso.alchemy import CoerceUnicode
from virtuoso.vmapping import PatternIriClass
# from virtuoso.textindex import TextIndex, TableWithTextIndex
from bs4 import BeautifulSoup

from ..lib.sqla import (INSERT_OP, UPDATE_OP, get_model_watcher, Base)
from ..lib.utils import get_global_base_url
from . import DiscussionBoundBase
from .langstrings import (LangString, LangStringEntry)
from ..semantic.virtuoso_mapping import QuadMapPatternS
from ..auth import (
    CrudPermissions, P_ADD_POST, P_READ, P_ADMIN_DISC, P_EDIT_POST)
from ..semantic.namespaces import (
    SIOC, CATALYST, ASSEMBL, DCTERMS, QUADNAMES, FOAF)
from .discussion import Discussion
from assembl.views.traversal import AbstractCollectionDefinition


log = logging.getLogger('assembl')


class ContentSource(DiscussionBoundBase):
    """
    A ContentSource is where any outside content comes from. .
    """
    __tablename__ = "content_source"
    rdf_class = SIOC.Container

    id = Column(Integer, primary_key=True,
                info={'rdf': QuadMapPatternS(None, ASSEMBL.db_id)})
    name = Column(UnicodeText, nullable=False)
    type = Column(String(60), nullable=False)

    creation_date = Column(DateTime, nullable=False, default=datetime.utcnow,
        info={'rdf': QuadMapPatternS(None, DCTERMS.created)})

    discussion_id = Column(Integer, ForeignKey(
        'discussion.id',
        ondelete='CASCADE',
        onupdate='CASCADE'
    ), nullable=False)
    connection_error = Column(SmallInteger)
    error_description = Column(String)
    error_backoff_until = Column(DateTime)

    @classmethod
    def special_quad_patterns(cls, alias_maker, discussion_id):
        return [
            QuadMapPatternS(
                Discussion.iri_class().apply(cls.discussion_id),
                CATALYST.uses_source,
                cls.iri_class().apply(cls.id),
                name=QUADNAMES.uses_source,
                conditions=(cls.discussion_id != None,)),
        ]

    discussion = relationship(
        "Discussion",
        backref=backref(
            'sources', order_by=creation_date,
            cascade="all, delete-orphan"),
        info={'rdf': QuadMapPatternS(None, ASSEMBL.in_conversation)})

    __mapper_args__ = {
        'polymorphic_identity': 'content_source',
        'polymorphic_on': type,
        'with_polymorphic': '*'
    }

    retypeable_as = ("IMAPMailbox", "MailingList", "AbstractMailbox",
                     "AbstractFilesystemMailbox", "AnnotatorSource",
                     "PostSource", "FeedPostSource", "LoomioPostSource",
                     "FacebookGenericSource", "FacebookGroupSource",
                     "FacebookPagePostsSource", "FacebookPageFeedSource",
                     "FacebookSinglePostSource", "EdgeSenseDrupalSource")

    @abstractmethod
    def generate_message_id(self, source_post_id):
        # Generate a globally unique message_id for the post using
        # its source_post_id (locally unique within that source.)
        # In many cases, the source_post_id is already globally unique.
        return source_post_id

    _non_email_chars = re.compile(r'[^!#-\'\*\+\-\./-9=\?A-Z\^_`a-z\|\~]', re.U)

    @classmethod
    def flatten_source_post_id(cls, source_post_id, extra_length=0):
        # Ensure that a source_post_id can be used as part 1 of message_id
        sanitized = cls._non_email_chars.subn(
            lambda c: '_' + hex(ord(c.group()))[2:], source_post_id)[0]
        if len(sanitized) + extra_length > 64:
            # 64 is max according to RFC 5322
            # cut it short and add a digest of original
            import hashlib
            import base64
            d = hashlib.md5()
            d.update(source_post_id)
            d = base64.urlsafe_b64encode(d.digest())
            sanitized = sanitized[
                :max(0, 64-len(d)-extra_length-1)]
            if sanitized:
                sanitized += "_" + d
            else:
                sanitized = d
        return sanitized

    def import_content(self, only_new=True):
        from assembl.tasks.source_reader import wake
        wake(self.id, reimport=not only_new)

    def make_reader(self):
        return None

    def get_discussion_id(self):
        return self.discussion_id or self.discussion.id

    @property
    def connection_error_as_text(self):
        from ..tasks.source_reader import ReaderStatus
        return (ReaderStatus(self.connection_error).name
                if self.connection_error is not None else None)

    @classmethod
    def get_discussion_conditions(cls, discussion_id, alias_maker=None):
        return (cls.discussion_id == discussion_id,)

    # Cannot be readable to all, because subclasses contain passwords
    crud_permissions = CrudPermissions(P_ADMIN_DISC, P_ADMIN_DISC)


class PostSource(ContentSource):
    """
    A Discussion PostSource is where commentary that is handled in the form of
    Assembl posts comes from.

    A discussion source should have a method for importing all content, as well
    as only importing new content. Maybe the standard interface for this should
    be `source.import()`.
    """
    __tablename__ = "post_source"
    rdf_class = ASSEMBL.PostSource

    id = Column(Integer, ForeignKey(
        'content_source.id',
        ondelete='CASCADE',
        onupdate='CASCADE'
    ), primary_key=True)

    last_import = Column(DateTime)

    __mapper_args__ = {
        'polymorphic_identity': 'post_source',
    }

    def get_discussion_id(self):
        return self.discussion_id or self.discussion.id

    def get_default_prepended_id(self):
        # Used for PostSource's whose incoming posts cannot guarantee
        # ImportedPost.source_post_id is unique; in which case, the Post.message_id
        # which is a globally unique value maintain uniqueness integrity
        # by calling this function
        # Must be implemented by subclasses that will not have unique
        # id's on their incoming posts
        return ""

    @property
    def number_of_imported_posts(self):
        from .post import ImportedPost
        return self.db.query(ImportedPost).filter_by(source_id=self.id).count()

    @classmethod
    def get_discussion_conditions(cls, discussion_id, alias_maker=None):
        return (cls.discussion_id == discussion_id,)

    def send_post(self, post):
        """ Send a new post in the discussion to the source. """
        log.warn(
            "Source %s did not implement PostSource::send_post()"
            % self.__class__.__name__)


class AnnotatorSource(ContentSource):
    """
    A source of content coming from annotator
    """
    __tablename__ = "annotator_source"

    id = Column(Integer, ForeignKey(
        'content_source.id',
        ondelete='CASCADE',
        onupdate='CASCADE'
    ), primary_key=True)

    __mapper_args__ = {
        'polymorphic_identity': 'annotator_source',
    }


class ContentSourceIDs(Base):
    """
    A table that keeps track of the number of external identities that
    an Assembl post can be exported to.

    A stepping-stone to having Sinks
    """
    __tablename__ = 'content_source_ids'

    id = Column(Integer, primary_key=True)
    source_id = Column(
        Integer, ForeignKey(
            'content_source.id', onupdate='CASCADE', ondelete='CASCADE'),
        nullable=False)
    source = relationship('ContentSource', backref=backref(
                          'pushed_messages',
                          cascade='all, delete-orphan'))

    post_id = Column(
        Integer, ForeignKey(
            'content.id', onupdate='CASCADE', ondelete='CASCADE'),
        nullable=False)
    post = relationship('Content',
                        backref=backref('post_sink_associations',
                                        cascade='all, delete-orphan'))
    message_id_in_source = Column(String(256), nullable=False)


class Content(DiscussionBoundBase):
    """
    Content is a polymorphic class to describe what is imported from a Source.
    The body and subject properly belong to the Post but were moved here to
    optimize the most common case.
    """
    __tablename__ = "content"
    # __table_cls__ = TableWithTextIndex

    rdf_class = SIOC.Post

    id = Column(Integer, primary_key=True,
                info={'rdf': QuadMapPatternS(None, ASSEMBL.db_id)})
    type = Column(String(60), nullable=False)
    creation_date = Column(DateTime, nullable=False, default=datetime.utcnow,
        info={'rdf': QuadMapPatternS(None, DCTERMS.created)})

    discussion_id = Column(Integer, ForeignKey(
        'discussion.id',
        ondelete='CASCADE',
        onupdate='CASCADE',
    ),
        nullable=False,)

    discussion = relationship(
        "Discussion",
        backref=backref(
            'posts', order_by=creation_date,
            cascade="all, delete-orphan"),
        info={'rdf': QuadMapPatternS(None, ASSEMBL.in_conversation)}
    )

    subject_id = Column(Integer, ForeignKey(LangString.id))
    body_id = Column(Integer, ForeignKey(LangString.id))
    subject = relationship(
        LangString,
        primaryjoin=subject_id == LangString.id)
    body = relationship(
        LangString,
        primaryjoin=body_id == LangString.id)

    @classmethod
    def subqueryload_options(cls):
        # Options for subquery loading. Use when there are many languages in the discussion.
        return (
            LangString.subqueryload_option(cls.subject),
            LangString.subqueryload_option(cls.body))

    @classmethod
    def joinedload_options(cls):
        # Options for joined loading. Use when there are few languages in the discussion.
        return (
            LangString.joinedload_option(cls.subject),
            LangString.joinedload_option(cls.body))

    @classmethod
    def best_locale_query(cls, locales):
        "BUGGY. Return a query that will load the post, best subject and best body for the given locales"
        # this fails because virtuoso, but the SQL is correct.
        # Note that it fails with just body, and succeeds with subject.
        # Go figure. Fortunately not needed yet.
        subject_ls = aliased(LangString)
        body_ls = aliased(LangString)
        best_subject_sq = LangString.best_lang_old(locales)
        best_body_sq = LangString.best_lang_old(locales)

        return cls.default_db.query(
            cls, best_subject_sq, best_body_sq).join(
            subject_ls, cls.subject_id == subject_ls.id).join(
            best_subject_sq).join(
            body_ls, cls.body_id == body_ls.id).join(best_body_sq)

    # old_subject = Column("subject", CoerceUnicode(), server_default="",
    #     info={'rdf': QuadMapPatternS(None, DCTERMS.title)})
    # TODO: check HTML or text? SIOC.content should be text.
    # Do not give it for now, privacy reasons
    # old_body = Column("body", UnicodeText, server_default="")
    #    info={'rdf': QuadMapPatternS(None, SIOC.content)})

    hidden = Column(Boolean, server_default='0')

    # Another bloody virtuoso bug. Insert with large string fails.
    # body_text_index = TextIndex(body, clusters=[discussion_id])

    __mapper_args__ = {
        'polymorphic_identity': 'content',
        'polymorphic_on': 'type',
        'with_polymorphic': '*'
    }

    def get_body(self):
        return self.body

    def get_title(self):
        return self.subject

    def get_body_mime_type(self):
        """ Return the format of the body, so the frontend will know how to
        display it.  Currently, only:
        text/plain (Understood as preformatted text)
        text/html (Undestood as some subset of html)
        """
        return "text/plain"

    def get_body_as_html(self):
        mimetype = self.get_body_mime_type()
        body = self.body
        if not body:
            return None
        if mimetype == 'text/html':
            return body
        elif mimetype == "text/plain":
            ls = LangString()
            for e in body.entries:
                _ = LangStringEntry(
                    value='<span style="white-space: pre-wrap">%s</div>' % (
                        e.value,),
                    langstring=ls, locale_id=e.locale_id)
            return ls
        else:
            log.error("What is this mimetype?" + mimetype)
            return body

    def get_body_as_text(self):
        mimetype = self.get_body_mime_type()
        body = self.body
        if not body:
            return None
        if mimetype == 'text/plain':
            return body
        elif mimetype == 'text/html':
            ls = LangString()
            for e in body.entries:
                _ = LangStringEntry(
                    value=BeautifulSoup(e.value).get_text().strip(),
                    langstring=ls, locale_id=e.locale_id)
            return ls
        else:
            log.error("What is this mimetype?" + mimetype)
            return body

    def send_to_changes(self, connection=None, operation=UPDATE_OP,
                        discussion_id=None, view_def="changes"):
        super(Content, self).send_to_changes(
            connection, operation, discussion_id, view_def)
        watcher = get_model_watcher()
        if operation == INSERT_OP:
            watcher.processPostCreated(self.id)

    def get_discussion_id(self):
        return self.discussion_id or self.discussion.id

    @property
    def exported_to_sources(self):
        return [ContentSource.uri_generic(s.source_id)
                for s in self.post_sink_associations]

    @classmethod
    def get_discussion_conditions(cls, discussion_id, alias_maker=None):
        return (cls.discussion_id == discussion_id,)

    @classmethod
    def special_quad_patterns(cls, alias_maker, discussion_id):
        discussion_alias = alias_maker.get_reln_alias(cls.discussion)
        return [
            QuadMapPatternS(
                None, FOAF.homepage,
                PatternIriClass(
                    QUADNAMES.post_external_link_iri,
                    # TODO: Use discussion.get_base_url.
                    # This should be computed outside the DB.
                    get_global_base_url() + '/%s/posts/local:Content/%d', None,
                    ('slug', Unicode, False), ('id', Integer, False)).apply(
                    discussion_alias.slug, cls.id),
                name=QUADNAMES.post_external_link_map)
        ]

    widget_idea_links = relationship('IdeaContentWidgetLink')

    def indirect_idea_content_links(self):
        "Return all ideaContentLinks related to this post or its ancestors"
        from .idea_content_link import IdeaContentLink
        ancestors = filter(None, self.ancestry.split(","))
        ancestors = [int(x) for x in ancestors]
        ancestors.append(self.id)
        return self.db.query(IdeaContentLink).filter(
            IdeaContentLink.content_id.in_(ancestors)).all()

    @classmethod
    def extra_collections(cls):
        from .idea_content_link import IdeaContentLink

        class IdeaContentLinkCollection(AbstractCollectionDefinition):
            def __init__(self, cls):
                super(IdeaContentLinkCollection, self
                      ).__init__(cls, IdeaContentLink)

            def decorate_query(
                    self, query, owner_alias, last_alias, parent_instance,
                    ctx):
                parent = owner_alias
                children = last_alias
                ancestors = filter(None, parent_instance.ancestry.split(","))
                ancestors = [int(x) for x in ancestors]
                ancestors.append(parent_instance.id)
                return query.join(
                    parent, children.content_id.in_(ancestors))

            def decorate_instance(
                    self, instance, parent_instance, assocs, user_id,
                    ctx, kwargs):
                pass

            def contains(self, parent_instance, instance):
                return instance.content_id == parent_instance.id or (
                    str(instance.content_id) in
                    parent_instance.ancestry.split(","))

        return {'indirect_idea_content_links': IdeaContentLinkCollection(cls)}

    def widget_ideas(self):
        from .idea import Idea
        return [Idea.uri_generic(wil.idea_id) for wil in self.widget_idea_links]

    crud_permissions = CrudPermissions(
            P_ADD_POST, P_READ, P_EDIT_POST, P_ADMIN_DISC,
            P_EDIT_POST, P_ADMIN_DISC)
