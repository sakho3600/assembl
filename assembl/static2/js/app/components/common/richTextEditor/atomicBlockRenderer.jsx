// @flow
import React from 'react';
import { ContentState } from 'draft-js';
import type { ContentBlock } from 'draft-js';

import DocumentExtensionIcon from '../documentExtensionIcon';

const AtomicBlockRenderer = ({ block, contentState }: { block: ContentBlock, contentState: ContentState }) => {
  const entityKey = block.getEntityAt(0);
  const entity = contentState.getEntity(entityKey);
  const data = entity.getData();
  const type = entity.getType();
  if (type === 'document') {
    let innerContent;
    const { mimeType, title } = data;
    if (mimeType.startsWith('image')) {
      innerContent = <img src={data.externalUrl} alt="" title={title} width="60%" />;
    } else {
      innerContent = <DocumentExtensionIcon filename={title} />;
    }

    return (
      <div className="atomic-block" data-blockType="atomic">
        {innerContent}
      </div>
    );
  }

  return <div />;
};

export default AtomicBlockRenderer;