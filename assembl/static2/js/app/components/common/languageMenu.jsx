import React from 'react';
import { connect } from 'react-redux';
import { setLocale } from 'react-redux-i18n';
import { compose, graphql } from 'react-apollo';
import { NavDropdown, MenuItem } from 'react-bootstrap';
import { getAvailableLocales } from '../../utils/i18n';
import { addLanguagePreference } from '../../actions/adminActions';
import { LOCALE } from '../../constants';
import withLoadingIndicator from './withLoadingIndicator';
import getDiscussionPreferenceLanguage from '../../graphql/DiscussionPreferenceLanguage.graphql';

class LanguageMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = { availableLocales: [], preferencesMapByLocale: {} };
  }

  componentWillMount() {
    this.setAvailableLanguages(this.props);
  }

  componentWillReceiveProps(nextProps) {
    this.setAvailableLanguages(nextProps);
  }

  doChangeLanguage(key) {
    const { changeLanguage } = this.props;
    localStorage.setItem(LOCALE, key);
    changeLanguage(key);
  }

  setAvailableLanguages = (props) => {
    const { addLanguageToStore, data, i18n } = props;
    const prefs = data.discussionPreferences.languages;
    const preferencesMapByLocale = {};
    prefs.forEach((p) => {
      if (p.locale === 'zh_Hans') {
        preferencesMapByLocale.zh_CN = { ...p };
        preferencesMapByLocale.zh_CN.name = p.name.split(' (')[0]; // shorten the name for chinese
        preferencesMapByLocale.zh_CN.nativeName = p.nativeName.split(' (')[0];
        preferencesMapByLocale.zh_CN.locale = 'zh_CN';
      } else {
        preferencesMapByLocale[p.locale] = { ...p };
        preferencesMapByLocale[p.locale].name = p.name.split(' (')[0]; // shorten the name for japanese, not need for hiragana
        preferencesMapByLocale[p.locale].nativeName = p.nativeName.split(' (')[0];
      }
      // Big side effect, addLanguageToStore needs to be called here for the languages in the admininistration page
      // to be selected... if we remove that line, we can remove the state, componentWillMount, componentWillReceiveProps
      // and just calculate availableLocales and preferencesMapByLocale in render.
      addLanguageToStore(p.locale);
    });
    const availableLocales = getAvailableLocales(i18n.locale, preferencesMapByLocale);
    this.setState({ availableLocales: availableLocales, preferencesMapByLocale: preferencesMapByLocale });
  };

  getLocaleLabel = (locale) => {
    const info = this.state.preferencesMapByLocale[locale];
    return info ? info.nativeName : locale;
  };

  render() {
    const { size, i18n } = this.props;
    if (this.state.availableLocales.length > 0) {
      return (
        <ul className={`dropdown-${size} uppercase`}>
          <NavDropdown pullRight title={i18n.locale.split('_')[0]} id="nav-dropdown">
            <MenuItem key={i18n.locale} className="active">
              {this.getLocaleLabel(i18n.locale)}
            </MenuItem>
            {this.state.availableLocales.map((availableLocale) => {
              return (
                <MenuItem
                  onClick={() => {
                    this.doChangeLanguage(availableLocale);
                  }}
                  key={availableLocale}
                >
                  {this.getLocaleLabel(availableLocale)}
                </MenuItem>
              );
            })}
          </NavDropdown>
        </ul>
      );
    }
    return null;
  }
}

const mapStateToProps = (state) => {
  return {
    i18n: state.i18n
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    changeLanguage: (locale) => {
      dispatch(setLocale(locale));
    },
    addLanguageToStore: (locale) => {
      dispatch(addLanguagePreference(locale));
    }
  };
};

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  graphql(getDiscussionPreferenceLanguage, {
    options: (props) => {
      return {
        variables: {
          inLocale: props.i18n.locale
        }
      };
    }
  }),
  withLoadingIndicator()
)(LanguageMenu);