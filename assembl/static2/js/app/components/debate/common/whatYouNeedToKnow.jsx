import React from 'react';
import { Translate } from 'react-redux-i18n';
import { getLocalizedContentFromString } from '../../../utils/globalFunctions';

export default ({ longTitle, locale }) => {
  // TODO: we need to cleanse longTitle before setting HTML content into the <p> tag
  const localizedTitle = getLocalizedContentFromString(longTitle, locale);
  return (
    <div className="insert-box wyntk-box">
      <h3 className="dark-title-4 wyntk-title">
        <Translate value="debate.whatYouNeedToKnow" />
      </h3>
      <div className="box-hyphen" />
      <div className="wyntk-text-container">
        <p
          className="wyntk-text"
          dangerouslySetInnerHTML={{
            __html: localizedTitle
          }}
        />
      </div>
    </div>
  );
};