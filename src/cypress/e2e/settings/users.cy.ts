/* eslint-disable max-lines */
import 'cypress-axe';
import { clearCookiesAndLogin } from '../helpers';

const namesShouldMatch = (names: string[]) => {
  cy.get('table tbody tr').each((row, index) => {
    cy.wrap(row).within(() => {
      cy.get('td').eq(1).should('contain.text', names[index]);
    });
  });
};

const checkWorngPasswordState = () => {
  cy.contains('An error occurred');
  cy.contains('button', 'View more').click();
  cy.contains('Request failed with status code 403: Forbidden');
  cy.contains('button', 'Dismiss').click();
  cy.get('aside').should('be.visible');
};

describe('Users', () => {
  before(() => {
    const env = { DATABASE_NAME: 'uwazi_e2e', INDEX_NAME: 'uwazi_e2e' };
    cy.exec('yarn e2e-fixtures', { env });
    clearCookiesAndLogin();
    cy.get('.only-desktop a[aria-label="Settings"]').click();
    cy.contains('span', 'Users & Groups').click();
    cy.contains('button', 'Users').click();
    cy.injectAxe();
  });

  it('accesibility check', () => {
    cy.get('caption').within(() => cy.contains('span', 'Users'));
    cy.checkA11y();
    cy.contains('button', 'Add user').click();
    cy.contains('h1', 'New user');
    cy.checkA11y();
    cy.contains('button', 'Cancel').click();
  });

  it('should be sorted by name by default', () => {
    const titles = ['Carmen', 'Cynthia', 'Mike', 'admin', 'blocky', 'colla', 'editor'];
    namesShouldMatch(titles);
  });

  describe('actions', () => {
    it('create user', () => {
      cy.intercept('GET', '/api/users').as('updateUsers');
      cy.contains('button', 'Add user').click();
      cy.get('aside').within(() => {
        cy.get('#username').type('User_1', { delay: 0 });
        cy.get('#email').type('user@mailer.com', { delay: 0 });
        cy.get('#password').type('secret', { delay: 0 });
        cy.getByTestId('multiselect').scrollIntoView();
        cy.getByTestId('multiselect').within(() => {
          cy.get('button').click();
          cy.contains('Activistas').click();
        });
      });
      cy.contains('button', 'Save').click();
      cy.get('[data-testid="modal"]').within(() => {
        cy.get('input').type('admin', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });
      cy.contains('span', 'User_1');
      cy.wait('@updateUsers');
      cy.contains('button', 'Dismiss').click();
    });

    it('edit user', () => {
      cy.contains('td', 'Carmen').siblings().last().click();
      cy.get('aside').within(() => {
        cy.get('#username').should('have.value', 'Carmen');
        cy.get('#email').should('have.value', 'carmen@huridocs.org');
        cy.get('#username').type('_edited', { delay: 0 });
        cy.get('#password').type('secret', { delay: 0 });
      });
      cy.contains('button', 'Save').click();
      cy.get('[data-testid="modal"]').within(() => {
        cy.get('input').type('admin', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });
      cy.contains('span', 'Carmen_edited');
      cy.contains('button', 'Dismiss').click();
    });

    it('delete user', () => {
      cy.intercept('GET', '/api/users').as('updateUsers');
      cy.contains('td', 'User_1').siblings().first().click();
      cy.contains('button', 'Delete').click();
      cy.get('[data-testid="modal"]').within(() => {
        cy.contains('li', 'User_1');
        cy.get('input').type('admin', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });
      cy.contains('button', 'Dismiss').click();
      cy.wait('@updateUsers');
      cy.contains('span', 'User_1').should('not.exist');
    });

    it('should check the changes and the password change for the modified user', () => {
      namesShouldMatch(['Carmen_edited', 'Cynthia', 'Mike', 'admin', 'blocky', 'colla', 'editor']);
      clearCookiesAndLogin('User_1', 'does not matter it was deleted');
      cy.contains('span', 'Login failed');
      cy.get('input[name="username"]').clear();
      cy.get('input[name="password"]').clear();
      cy.get('input[name="username"]').type('Carmen_edited', { delay: 0 });
      cy.get('input[name="password"]').type('secret', { delay: 0 });
      cy.get('button[type="submit"').click();
      cy.contains('Return to login').click();
    });
  });

  describe('form validations', () => {
    before(() => {
      clearCookiesAndLogin();
      cy.get('.only-desktop a[aria-label="Settings"]').click();
      cy.contains('span', 'Users & Groups').click();
      cy.contains('button', 'Users').click();
    });

    it('check for unique name and email', () => {
      cy.contains('button', 'Add user').click();
      cy.get('aside').within(() => {
        cy.get('#username').type('admin', { delay: 0 });
        cy.get('#email').type('admin@uwazi.com', { delay: 0 });
        cy.contains('button', 'Save').click();
        cy.contains('span', 'Duplicated username').should('exist');
        cy.contains('span', 'Duplicated email').should('exist');
      });
    });

    it('should check for spaces in the username', () => {
      cy.get('aside').within(() => {
        cy.get('#username').type(' some spaces', { delay: 0 });
        cy.contains('button', 'Save').click();
        cy.contains('span', 'Usernames cannot have spaces').should('exist');
      });
    });

    it('should not allow usernames that are too short or too long', () => {
      cy.get('aside').within(() => {
        cy.get('#username').clear();
        cy.get('#username').type('Al');
        cy.contains('button', 'Save').click();
        cy.contains('span', 'Username is too short').should('exist');
        cy.get('#username').clear();
        cy.get('#username').type('LongNameForAUserWhatIsTheAdminThinkingWhenCreatingIt', {
          delay: 0,
        });
        cy.contains('button', 'Save').click();
        cy.contains('span', 'Username is too long').should('exist');
      });
    });

    it('should not allow very long passwords', () => {
      cy.get('aside').within(() => {
        cy.get('#password').type('This passwords has more then 50 chatacters, it should fail.', {
          delay: 0,
        });
        cy.contains('button', 'Save').click();
        cy.contains('span', 'Password is too long').should('exist');
      });
    });

    it('should required email', () => {
      cy.get('aside').within(() => {
        cy.get('#email').clear();
        cy.contains('button', 'Save').click();
        cy.contains('span', 'A valid email is required').should('exist');
      });
      cy.contains('button', 'Cancel').click();
    });
  });

  describe('reset password and 2fa', () => {
    it('reset password', () => {
      cy.intercept('GET', '/api/users').as('updateUsers');

      cy.contains('td', 'Carmen_edited').siblings().first().click();

      cy.contains('button', 'Reset Password').click();
      cy.contains('[data-testid="modal"] button', 'Accept').click();
      cy.contains('div', 'Instructions to reset the password were sent to the user');
      cy.wait('@updateUsers');
      cy.contains('button', 'Dismiss').click();
    });

    it('Reset 2fa', () => {
      cy.intercept('GET', '/api/users').as('updateUsers');
      cy.contains('span', 'Password + 2fa');

      cy.contains('td', 'blocky').siblings().first().click();

      cy.contains('button', 'Reset 2FA').click();
      cy.get('[data-testid="modal"]').within(() => {
        cy.contains('li', 'blocky');
        cy.get('input').type('admin', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });

      cy.get('table tbody tr')
        .eq(4)
        .within(() => {
          cy.contains('span', 'Password + 2fa').should('not.exist');
        });
      cy.wait('@updateUsers');
      cy.contains('button', 'Dismiss').click();
    });
  });

  describe('unblock user', () => {
    it('should not be able to ublock a user if the password is incorrect', () => {
      cy.contains('td', 'blocky').siblings().contains('button', 'Edit').click();

      cy.contains('button', 'Unlock account').click();

      cy.get('[data-testid="modal"]').within(() => {
        cy.contains('Confirm action');
        cy.get('input').type('wroooong!', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });

      checkWorngPasswordState();
    });

    it('should unblock a user', () => {
      cy.intercept('GET', '/api/users').as('updateUsers');

      cy.contains('button', 'Unlock account').click();

      cy.get('[data-testid="modal"]').within(() => {
        cy.contains('Confirm action');
        cy.get('input').type('admin', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });

      cy.wait('@updateUsers');
    });

    it('should log in with the unblocked user', () => {
      cy.contains('a', 'Account').click();
      clearCookiesAndLogin('blocky', '1234');
      cy.contains('a', 'Settings').click();
      cy.contains('a', 'Account').click();
      cy.get('#account-username').should('have.value', 'blocky');
    });
  });

  describe('change roles', () => {
    before(() => {
      clearCookiesAndLogin();
      cy.get('.only-desktop a[aria-label="Settings"]').click();
      cy.contains('span', 'Users & Groups').click();
      cy.contains('button', 'Users').click();
    });

    it('should make a collaborator user into an admin', () => {
      cy.get(':nth-child(6) > :nth-child(6) > button').click();
      cy.get('aside').within(() => {
        cy.get('input[name="username"]').clear();
        cy.get('input[name="username"]').type('admin2', { delay: 0 });
        cy.get('input[name="password"]').type('password', { delay: 0 });
        cy.get('#roles').select('admin');
      });
      cy.contains('button', 'Save').click();
      cy.get('[data-testid="modal"]').within(() => {
        cy.get('input').type('admin', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });
      cy.contains('button', 'Dismiss').click();
    });

    it('should log in with the new admin user', () => {
      clearCookiesAndLogin('admin2', 'password');
      cy.get('.only-desktop a[aria-label="Settings"]').click();
      cy.contains('span', 'Users & Groups').click();
      cy.contains('button', 'Users').click();
    });
  });

  describe('bulk actions', () => {
    it('bulk password reset', () => {
      cy.contains('td', 'Carmen_edited').siblings().first().click();
      cy.contains('td', 'Cynthia').siblings().first().click();

      cy.contains('button', 'Reset Password').click();

      cy.getByTestId('modal').within(() => {
        cy.contains('h1', 'Reset passwords');
        cy.contains('li', 'Carmen_edited');
        cy.contains('li', 'Cynthia');
        cy.get('input').should('not.exist');
        cy.contains('button', 'Accept').click();
      });

      cy.contains('div', 'Instructions to reset the password were sent to the user');

      cy.contains('button', 'Dismiss').click();
    });

    it('bulk reset 2FA', () => {
      cy.intercept('GET', '/api/user*').as('getUsers');

      cy.contains('td', 'Carmen_edited').siblings().first().click();
      cy.contains('td', 'Mike').siblings().first().click();

      cy.contains('button', 'Reset 2FA').click();

      cy.getByTestId('modal').within(() => {
        cy.contains('h1', 'Reset 2FA');
        cy.contains('li', 'Carmen_edited');
        cy.contains('li', 'Mike');
        cy.get('input').type('password', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });

      cy.wait('@getUsers');

      cy.contains('button', 'Dismiss').click();

      cy.get('table tbody tr')
        .eq(0)
        .within(() => {
          cy.contains('span', 'Password + 2fa').should('not.exist');
        });
      cy.get('table tbody tr')
        .eq(1)
        .within(() => {
          cy.contains('span', 'Password + 2fa');
        });
      cy.get('table tbody tr')
        .eq(2)
        .within(() => {
          cy.contains('span', 'Password + 2fa').should('not.exist');
        });
    });

    it('bulk delete', () => {
      cy.intercept('GET', '/api/users').as('getUsers');
      cy.intercept('GET', '/api/usergroups').as('getGroups');

      cy.contains('td', 'Carmen_edited').siblings().first().click();
      cy.contains('td', 'Mike').siblings().first().click();

      cy.contains('button', 'Delete').click();

      cy.getByTestId('modal').within(() => {
        cy.contains('h1', 'Delete');
        cy.contains('li', 'Carmen_edited');
        cy.contains('li', 'Mike');
        cy.get('input').type('password', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });

      cy.wait('@getUsers');

      cy.wait('@getGroups');
      cy.contains('button', 'Dismiss').click();
      cy.contains('span', 'Carmen_edited').should('not.exist');
      cy.contains('span', 'Mike').should('not.exist');

      namesShouldMatch(['Cynthia', 'admin', 'admin2', 'blocky', 'editor']);
    });
  });

  describe('validate password', () => {
    it('should not be able to edit another user if the password is incorrect', () => {
      cy.contains('td', 'Cynthia').siblings().last().click();
      cy.get('aside').within(() => {
        cy.get('#password').type('changed password', { delay: 0 });
        cy.contains('button', 'Save').click();
      });

      cy.get('[data-testid="modal"]').within(() => {
        cy.get('input').type('theIncorrectPassword!!', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });

      checkWorngPasswordState();
    });

    it('should not be able to reset 2fa if the password is incorrect', () => {
      cy.contains('button', 'Reset 2FA').click();

      cy.get('[data-testid="modal"]').within(() => {
        cy.get('input').type('anotherWorng!!', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });

      checkWorngPasswordState();
    });
  });
});
