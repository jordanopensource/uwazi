import { clearCookiesAndLogin } from '../helpers';
import 'cypress-axe';

describe('Settings mobile menu', () => {
  before(() => {
    cy.blankState();
  });

  beforeEach(() => {
    cy.viewport(384, 768);
  });

  it('should login', () => {
    clearCookiesAndLogin('admin', 'change this password now');
  });

  it('should only show the menu', () => {
    cy.location().should(location => {
      expect(location.pathname).to.contain('library');
    });
    cy.get('.menu-button').click();
    cy.contains('.only-mobile a', 'Settings').click();
    cy.location().should(location => {
      expect(location.pathname).to.contain('settings');
    });
    cy.get('.tw-content').should('not.exist');
  });

  it('should enter the account settings', () => {
    cy.intercept('api/user').as('getUser');
    cy.contains('a', 'Account').click();
    cy.wait('@getUser');
    cy.get('.tw-content').should('be.visible');
  });

  it('should go back to the menu', () => {
    cy.contains('a', 'Navigate back').click();
    cy.get('.tw-content').should('not.exist');
  });
});
