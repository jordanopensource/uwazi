import { clickOnCreateEntity, clickOnEditEntity } from './helpers/entities';
import { clearCookiesAndLogin } from './helpers/login';

describe('Copy from entity', () => {
  before(() => {
    const env = { DATABASE_NAME: 'uwazi_e2e', INDEX_NAME: 'uwazi_e2e' };
    cy.exec('yarn e2e-fixtures', { env });
    clearCookiesAndLogin();
  });

  describe('Creating a new entity', () => {
    // eslint-disable-next-line max-statements
    it('should copy the metadata from an existing entity to create a new one', () => {
      clickOnCreateEntity();
      cy.get('#metadataForm').find('select').select('Ordenes de la corte');
      cy.get('#metadataForm').find('.form-group.select').find('select').select('d3b1s0w3lzi');
      cy.get('[name="library.sidepanel.metadata.title"]').type('New orden de la corte', {
        delay: 0,
      });

      cy.contains('button', 'Copy From').click();
      cy.intercept('GET', 'api/search?searchTerm=%2226%20de%20febrero%22*').as('searchRequest');
      cy.get('.copy-from div.search-box > div > input').type('"26 de febrero"', { delay: 0 });
      cy.wait('@searchRequest');
      cy.get('.sidepanel-body.scrollable').scrollTo('top');
      cy.contains(
        '.copy-from div:nth-child(1) > div.item-info',
        'Artavia Murillo y otros. Resolución de la CorteIDH de 26 de febrero de 2016'
      ).click();
      cy.contains('button', 'Copy Highlighted').click();
      cy.get('div.copy-from').should('not.exist');
      cy.contains('button', 'Save').click();
      cy.contains('Entity created').as('successMessage');
      cy.get('@successMessage').should('not.exist', { timeout: 200 });
    });

    it('should view the new entity', () => {
      cy.contains('h2', 'New orden de la corte').click();
      cy.get('.side-panel.metadata-sidepanel.is-active').within(() => {
        cy.contains('a', 'View').click();
      });
      cy.contains('h1', 'New orden de la corte');
    });

    it('should check the data for the new entity', () => {
      cy.get('.entity-metadata').within(() => {
        cy.get('.metadata-name-mecanismo').within(() => {
          cy.contains('Corte Interamericana de Derechos Humanos');
        });

        cy.get('.metadata-name-fecha').within(() => {
          cy.contains('Feb 26, 2016');
        });

        cy.get('.metadata-name-pa_s').within(() => {
          cy.contains('Costa Rica');
        });

        cy.get('.metadata-name-firmantes').within(() => {
          cy.contains('Alberto Pérez Pérez');
          cy.contains('Diego García-Sayán');
          cy.contains('Eduardo Ferrer Mac-Gregor Poisot');
          cy.contains('Eduardo Vio Grossi');
          cy.contains('Humberto Antonio Sierra Porto');
          cy.contains('Roberto de Figueiredo Caldas');
        });

        cy.get('.metadata-name-tipo').within(() => {
          cy.contains('Supervisión de cumplimiento de Sentencia');
        });

        cy.get('.metadata-name-categor_a').within(() => {
          cy.contains('Categoría 1');
        });
      });
    });
  });

  describe('editing an existing entity', () => {
    it('should edit an entity by using copy from', () => {
      cy.contains('a', 'Library').click();
      cy.contains(
        'h2',
        'Apitz Barbera y otros. Resolución de la CorteIDH de 29 de noviembre de 2007'
      ).click();
      clickOnEditEntity();
      cy.contains('button', 'Copy From').click({ force: true });

      cy.get('div.copy-from').within(() => {
        cy.get('input').type(
          'Apitz Barbera y otros. Resolución de la Presidenta de 18 de diciembre de 2009',
          { delay: 0 }
        );
        cy.contains(
          '.item-name',
          'Apitz Barbera y otros. Resolución de la Presidenta de 18 de diciembre de 2009'
        ).click();
        cy.contains('button', 'Copy Highlighted').click();
      });
      cy.get('div.copy-from').should('not.exist');

      cy.get('[name="library.sidepanel.metadata.title"]').clear();
      cy.get('[name="library.sidepanel.metadata.title"]').type('Edited orden de la corte', {
        delay: 0,
      });
      cy.get('#metadataForm')
        .contains('.multiselectItem-name', 'Comisión Interamericana de Derechos Humanos')
        .click();
      cy.contains('button', 'Save').click();
    });

    it('should view the edited entity', () => {
      cy.contains('Entity updated').click();
      cy.contains('h2', 'Edited orden de la corte').click();
      cy.get('.side-panel.metadata-sidepanel.is-active').within(() => {
        cy.contains('a', 'View').click();
      });
      cy.contains('h1', 'Edited orden de la corte');
    });

    it('should check the data for the edited entity', () => {
      cy.get('.metadata.tab-content-visible').within(() => {
        cy.contains('h1', 'Edited orden de la corte');

        cy.get('.metadata-name-mecanismo').within(() => {
          cy.contains('Comisión Interamericana de Derechos Humanos');
          cy.contains('Corte Interamericana de Derechos Humanos');
        });

        cy.get('.metadata-name-fecha').contains('Dec 1, 2018');

        cy.get('.metadata-name-pa_s').contains('Venezuela');

        cy.get('.metadata-name-firmantes').contains('Cecilia Medina Quiroga');

        cy.get('.metadata-name-tipo').contains('Supervisión de cumplimiento de Sentencia');
      });
    });
  });
});
