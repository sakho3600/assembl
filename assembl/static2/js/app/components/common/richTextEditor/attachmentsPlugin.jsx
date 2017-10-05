// @flow
/* draft-js plugin for attachment management */
import { convertFromRaw, convertToRaw, Entity, Modifier, RawContentState, SelectionState } from 'draft-js';
import type { ContentBlock } from 'draft-js';
import type { Attachment, Document } from '../attachments';

const ENTITY_TYPE = 'document';
const BLOCK_TYPE = 'atomic';

type NodeType = Object;

const plugin = {
  blockToHTML: (block: ContentBlock): { start: string, end: string } | null => {
    const type = block.type;
    if (type === 'atomic') {
      return { start: '<div class="atomic-block" data-blocktype="atomic">', end: '</div>' };
    }

    return null;
  },
  entityToHTML: (entity: { data: Document }, originalText: string): string => {
    if (entity.type === ENTITY_TYPE) {
      const { externalUrl, id } = entity.data;
      const mimeType = entity.data.mimeType ? entity.data.mimeType : '';
      const title = entity.data.title ? entity.data.title : '';
      if (mimeType.startsWith('image')) {
        return `<img src="${externalUrl}" alt="" title="${title}" width="60%" data-id="${id}" data-mimetype="${mimeType}" />`;
      }

      const extension = title.split('.')[1];
      return (
        `<span class="attachment-document" data-id="${id}" data-mimetype="${mimeType}"` +
        ` data-title="${title}" data-externalurl="${externalUrl}">${extension}</span>`
      );
    }

    return originalText;
  },
  htmlToBlock: (nodeName: string, node: NodeType, lastList: *, inBlock: string): void | string => {
    const isAtomicBlock = nodeName === 'div' && node.dataset.blocktype === BLOCK_TYPE;
    if (isAtomicBlock || (nodeName === 'img' && inBlock !== BLOCK_TYPE)) {
      return BLOCK_TYPE;
    }

    return undefined;
  },
  htmlToEntity: (nodeName: string, node: NodeType, createEntity: Function): Entity | void => {
    const defaultImageMimeType = 'image/*';
    const isLegacyImage =
      nodeName === 'img' && (node.parentNode && node.parentNode.dataset && node.parentNode.dataset.blocktype !== BLOCK_TYPE);
    if (isLegacyImage) {
      return createEntity(ENTITY_TYPE, 'IMMUTABLE', {
        externalUrl: node.src,
        id: node.dataset.id,
        title: node.title || '',
        type: 'document',
        mimeType: node.dataset.mimetype || defaultImageMimeType
      });
    }

    const isAtomicBlock = nodeName === 'div' && node.dataset && node.dataset.blocktype === BLOCK_TYPE;
    const isImage = isAtomicBlock && node.firstChild && node.firstChild.nodeName === 'IMG';
    if (isImage) {
      return createEntity(ENTITY_TYPE, 'IMMUTABLE', {
        externalUrl: node.firstChild.src,
        id: node.firstChild.dataset.id,
        title: node.firstChild.title || '',
        type: 'document',
        mimeType: node.firstChild.dataset.mimetype || defaultImageMimeType
      });
    } else if (isAtomicBlock) {
      const defaultMimeType = 'application/*';
      return createEntity(ENTITY_TYPE, 'IMMUTABLE', {
        externalUrl: node.firstChild.dataset.externalurl,
        id: node.firstChild.dataset.id,
        title: node.firstChild.dataset.title || '',
        type: 'document',
        mimeType: node.firstChild.dataset.mimetype || defaultMimeType
      });
    }

    return undefined;
  },

  getAttachments: (rawContentState: RawContentState): Array<Attachment> => {
    if (!rawContentState) {
      return [];
    }

    const contentState = convertFromRaw(rawContentState);
    const attachments = [];
    contentState.getBlockMap().forEach((block) => {
      if (block.type === 'atomic') {
        block.findEntityRanges((entityRange) => {
          const entityKey = entityRange.entity;
          if (entityKey) {
            const entity = contentState.getEntity(entityKey);
            if (entity && entity.data.id) {
              const attachment = {
                entityKey: entityKey,
                document: entity.data
              };
              attachments.push(attachment);
            }
          }
        });
      }
    });

    return attachments;
  },
  getAttachmentsDocumentIds: (rawContentState: RawContentState): Array<String> => {
    const contentState = convertFromRaw(rawContentState);
    const attachments = [];
    contentState.getBlockMap().forEach((block) => {
      if (block.type === 'atomic') {
        block.findEntityRanges((entityRange) => {
          const entityKey = entityRange.entity;
          if (entityKey) {
            const entity = contentState.getEntity(entityKey);
            if (entity && entity.data.id) {
              attachments.push(entity.data.id);
            }
          }
        });
      }
    });
    return attachments;
  },
  removeAttachment: (rawContentState: RawContentState, documentId: string): RawContentState => {
    let contentState = convertFromRaw(rawContentState);
    let targetBlock = null;
    contentState.getBlockMap().forEach((block) => {
      block.findEntityRanges((entityRange) => {
        const entityKey = entityRange.entity;
        if (entityKey) {
          const entity = contentState.getEntity(entityKey);
          if (entity && entity.data.id && entity.data.id === documentId) {
            targetBlock = block;
          }
        }
      });
    });

    if (targetBlock) {
      const targetRange = new SelectionState({
        anchorKey: targetBlock.key,
        anchorOffset: 0,
        focusKey: targetBlock.key,
        focusOffset: 1
      });

      contentState = Modifier.removeRange(contentState, targetRange, 'backward');
      contentState = Modifier.setBlockType(contentState, targetRange, 'unstyled');
      return convertToRaw(contentState);
    }

    return rawContentState;
  },

  uploadNewAttachments: (rawContentState: RawContentState, uploadDocument: Function): Promise<*> => {
    if (!rawContentState) {
      return new Promise((resolve) => {
        resolve({ contentState: null, documentIds: [] });
      });
    }

    const documentIds = [];
    let contentState = convertFromRaw(rawContentState);
    const entities = [];
    contentState.getBlockMap().forEach((block) => {
      if (block.type === 'atomic') {
        block.findEntityRanges((entityRange) => {
          const entityKey = entityRange.entity;
          if (entityKey) {
            const entity = contentState.getEntity(entityKey);
            if (entity) {
              entities.push({
                entityKey: entityKey,
                entity: entity
              });
            }
          }
        });
      }
    });

    let uploadDocumentsPromise = Promise.resolve();
    entities.forEach((entityInfo) => {
      const { entity, entityKey } = entityInfo;
      if (entity.data.file) {
        // this is a new document, add a promise to create it and modify its entity
        const variables = {
          file: entity.data.file
        };
        uploadDocumentsPromise = uploadDocumentsPromise.then(() => {
          return uploadDocument({ variables: variables }).then((res) => {
            if (res && res.data) {
              const doc = res.data.uploadDocument.document;
              documentIds.push(doc.id);
              // update entity
              const { externalUrl, id, mimeType, title } = doc;
              contentState = contentState.replaceEntityData(entityKey, {
                id: id,
                externalUrl: externalUrl,
                title: title,
                mimeType: mimeType
              });
            }
          });
        });
      } else {
        documentIds.push(entity.data.id);
      }
    });

    return uploadDocumentsPromise.then(() => {
      return new Promise((resolve) => {
        resolve({
          contentState: convertToRaw(contentState),
          documentIds: documentIds
        });
      });
    });
  }
};

export type UploadNewAttachmentsPromiseResult = {
  contentState: RawContentState,
  documentIds: Array<string>
};

export default plugin;