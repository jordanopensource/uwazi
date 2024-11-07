import { changeLanguage, clearCookiesAndLogin } from '../helpers';
import 'cypress-axe';

describe('Translations', () => {
  before(() => {
    const env = { DATABASE_NAME: 'uwazi_e2e', INDEX_NAME: 'uwazi_e2e' };
    cy.exec('yarn e2e-fixtures', { env });
    clearCookiesAndLogin();
    cy.get('.only-desktop a[aria-label="Settings"]').click();
    cy.contains('span', 'Translations').click();
  });

  beforeEach(() => {
    cy.injectAxe();
  });

  describe('translations list', () => {
    it('should be accessible', () => {
      cy.contains('User Interface');
      cy.get('[data-testid=settings-translations]').toMatchImageSnapshot();
      cy.checkA11y();
    });
  });

  describe('translation form', () => {
    it('should be accessible', () => {
      // cy.contains('[data-testid=content] button', 'Translate').click();
      cy.contains('td', 'Causa').siblings().contains('Translate').click();
      cy.checkA11y();
    });

    it('should sort the tables', () => {
      const checkOrder = (items: string[]) => {
        items.forEach(item => {
          cy.contains('caption', item).scrollIntoView();
        });
      };

      checkOrder([
        'Articulos no violados',
        'Articulos violados',
        'Causa',
        'Descriptores',
        'Envío a la corte',
        'Estado',
        'País',
        'Presentación ante la comisión',
        'Presentación ante la corte',
        'Resumen',
        'Title',
      ]);
    });

    it('should have breadcrumb navigation', () => {
      cy.contains('li > a > .translation', 'Translations').click();
      cy.contains('caption', 'System translations');
    });

    const checkEditResults = () => {
      cy.get('[data-testid=settings-translations-edit]').scrollTo('top');
      cy.contains('.bg-gray-100', 'ES');
      cy.contains('caption', 'Fecha');
      cy.contains('caption', 'Informe de admisibilidad');
      cy.get('table').eq(0).scrollIntoView();
      cy.get('table').eq(0).toMatchImageSnapshot();
    };

    it('Should edit a translation', () => {
      cy.contains('td', 'Informe de admisibilidad').siblings().find('a').click();
      cy.get('[data-testid=settings-translations-edit]').scrollTo('top');
      cy.get('input[type=text]').should('be.visible');
      cy.contains('caption', 'Fecha');
      cy.intercept('POST', '/api/translations').as('saveTranslations');
      cy.clearAndType('input[name="formValues.0.values.0.value"]', 'Date', { delay: 0 });
      cy.clearAndType('input[name="formValues.2.values.0.value"]', 'تاريخ', { delay: 0 });
      cy.contains('button', 'Save').click();
      cy.wait('@saveTranslations');
      checkEditResults();
    });

    it('should disable the form and buttons, and emit a notification when saving', () => {
      cy.contains('button', 'Save').click();
      cy.contains('button', 'Save').should('be.disabled');
      cy.contains('button', 'Cancel').should('be.disabled');
      cy.get('input[type=text]').should('be.disabled');
      cy.contains('[data-testid="notifications-container"]', 'Translations saved');
    });

    it('Should filter translations that have no untranslated terms', () => {
      cy.get('[data-testid=settings-translations-edit]').scrollTo('top');
      cy.contains('caption', 'Fecha');
      cy.get('input[type=text]').eq(0).should('have.value', 'Date');
      cy.contains('label', 'Untranslated Terms').click();
      cy.contains('caption', 'Informe de admisibilidad');
      cy.get('input[type=text]').eq(0).should('have.value', 'Informe de admisibilidad');
    });

    it('should notify the user if there is an error', () => {
      cy.intercept('POST', 'api/translations', {
        statusCode: 400,
      }).as('api/translations');
      cy.contains('button', 'Save').click();
      cy.wait('@api/translations').then(() => {
        cy.contains('[data-testid="notifications-container"]', 'An error occurred');
        cy.contains('button', 'Dismiss').trigger('mouseover');
        cy.contains('button', 'Dismiss').click();
      });
    });

    describe('discard changes', () => {
      it('should unfilter the from and clear the first field', () => {
        cy.get('div[data-testid=settings-translations-edit]').scrollTo('top');
        cy.get('[type="checkbox"]').check();
        cy.get('input[type=text]').eq(0).siblings('button').click();
      });

      it('should alert about unsaved changes when navigating', () => {
        cy.contains('a', 'Account').click();
        cy.contains('h1', 'Discard changes?');
        cy.checkA11y();
        cy.get('button[aria-label="Close modal"]').click();
      });

      it('Should discard changes', () => {
        //this reload is needed to clear several legacy notifications
        cy.reload();
        cy.get('input[type=text]').eq(0).type('unwanted change', { delay: 0 });
        cy.contains('button', 'Cancel').click();
        cy.contains('button', 'Discard changes').click();
        cy.get('[data-testid=settings-translations]').should('be.visible');
        cy.contains('td', 'Informe de admisibilidad').siblings().find('a').click();
        cy.get('form').should('be.visible');
        cy.get('input[type=text]').eq(0).should('have.value', 'Date');
      });
    });
  });

  describe('Live translations', () => {
    //The translations modal has not been tested with checkA11y since is not yet rewritten
    it('Should navigate to library and active live translate', () => {
      cy.contains('a', 'Library').click();
      cy.contains('button', 'English').click();
      cy.contains('button', 'Live translate').click();
    });

    it('should translate a text', () => {
      cy.contains('span', 'Filters').click();
      cy.get('input[id=es]').clear();
      cy.get('input[id=es]').type('Filtros', { delay: 0 });
      cy.get('input[id=en]').clear();
      cy.get('input[id=en]').type('Filtering', { delay: 0 });
      cy.contains('button', 'Submit').click();
      cy.get('[data-testid=modal]').should('not.exist');
    });

    it('should deactive the live translate and check the translatations in english and spanish', () => {
      cy.get('button[aria-label="Turn off inline translation"]').click();
      cy.contains('span', 'Filtering');
      changeLanguage('Español');
      cy.contains('span', 'Filtros');
    });
  });
});
