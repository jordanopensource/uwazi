/* eslint-disable max-statements */
/* eslint-disable max-lines */
import { clearCookiesAndLogin } from '../helpers';
import 'cypress-axe';

const labelEntityTitle = (
  entityPos: number,
  selectValue: string,
  selector: string = 'span[role="presentation"]'
) => {
  cy.get('.view-doc').eq(entityPos).click();
  cy.contains(selector, selectValue).setSelection(selectValue);
  cy.get('button.edit-metadata').click();
  cy.get('button.extraction-button').first().click();
  cy.get('textarea[name="documentViewer.sidepanel.metadata.title"]')
    .invoke('val')
    .should('eq', selectValue);
  cy.get('button[type="submit"]').click();
  cy.get('div.alert-success').click();
};

const checkTemplatesList = (templates: string[]) => {
  templates.map(template => cy.getByTestId('pill-comp').contains(template));
};

const editPropertyForExtractor = (
  alias: string,
  templateName: string,
  property: string,
  shouldUnfold = true
) => {
  cy.contains('span', templateName).as(alias);
  if (shouldUnfold) cy.get(`@${alias}`).click();
  cy.get(`@${alias}`).parent().parent().contains('span', property).click();
};

describe('Information Extraction', () => {
  before(() => {
    const env = { DATABASE_NAME: 'uwazi_e2e', INDEX_NAME: 'uwazi_e2e' };
    cy.exec('yarn e2e-fixtures', { env });
    cy.exec('yarn ix-config', { env });
    clearCookiesAndLogin();
  });

  describe('labeling entities', () => {
    // eslint-disable-next-line max-statements
    it('should label the title property for the first six entities', () => {
      labelEntityTitle(0, 'Lorem Ipsum');
      cy.get('a[aria-label="Library"]').click();
      labelEntityTitle(1, 'Uwazi Heroes Investigation');
      cy.get('a[aria-label="Library"]').click();
      labelEntityTitle(2, 'The Lizard');
      cy.get('a[aria-label="Library"]').click();
      labelEntityTitle(3, 'Batman v Superman: Dawn of Justice');
      cy.get('a[aria-label="Library"]').click();
      labelEntityTitle(4, 'The Amazing Spider-Man');
      cy.get('a[aria-label="Library"]').click();
      labelEntityTitle(5, 'Spider-Man: Shattered Dimensions');
      cy.get('a[aria-label="Library"]').click();
      labelEntityTitle(6, 'The Spectacular Spider-Man');
    });
  });

  describe('Dashboard', () => {
    before(() => {
      cy.injectAxe();
    });

    it('should navigate to the dashboard', () => {
      cy.get('.only-desktop a[aria-label="Settings"]').click();
      cy.contains('a', 'Metadata Extraction').click();
    });

    it('should create an extractor', () => {
      cy.contains('button', 'Create Extractor').click();
      cy.getByTestId('modal').within(() => {
        cy.get('input[id="extractor-name"]').type('Extractor 1', { delay: 0 });

        editPropertyForExtractor('firstTemplate', 'Ordenes del presidente', 'Title');

        editPropertyForExtractor('secondTemplate', 'Causa', 'Title');

        cy.contains('button', 'Next').click();
        cy.contains('Title');
        checkTemplatesList(['Ordenes del presidente', 'Causa']);
        cy.contains('button', 'Create').click();
      });

      cy.contains('td', 'Extractor 1');
      cy.contains('button', 'Dismiss').click();
    });

    it('should create another extractor selecting all templates', () => {
      cy.contains('button', 'Create Extractor').click();
      cy.getByTestId('modal').within(() => {
        cy.get('input[id="extractor-name"]').type('Titles from all templates', { delay: 0 });
        editPropertyForExtractor('ordenesDelPresidente', 'Ordenes del presidente', 'Title');
        cy.contains('button', 'Select all').click();
        cy.contains('button', 'Next').click();
        checkTemplatesList([
          'Mecanismo',
          'Ordenes de la corte',
          'Informe de admisibilidad',
          'País',
          'Ordenes del presidente',
          'Causa',
          'Voto Separado',
          'Medida Provisional',
          'Sentencia de la corte',
          'Juez y/o Comisionado',
          'Reporte',
        ]);
        cy.contains('button', 'Create').click();
      });
      cy.contains('td', 'Titles from all templates');
      cy.contains('button', 'Dismiss').click();
    });

    it('should disable the button to select all templates if no property is selected', () => {
      cy.contains('button', 'Create Extractor').click();
      cy.getByTestId('modal').within(() => {
        cy.contains('button', 'Select all').should('not.exist');
        editPropertyForExtractor('ordenesDelPresidente', 'Ordenes del presidente', 'Title');
        cy.contains('button', 'Select all').should('exist');
        editPropertyForExtractor('ordenesDelPresidente', 'Ordenes del presidente', 'Title', false);
        cy.contains('button', 'Select all').should('not.exist');
        cy.contains('button', 'Cancel').click();
      });
    });

    it('should create another extractor selecting all templates with the relevant property', () => {
      cy.contains('button', 'Create Extractor').click();
      cy.getByTestId('modal').within(() => {
        cy.get('input[id="extractor-name"]').type('Fechas from relevant templates', { delay: 0 });

        editPropertyForExtractor('ordenesDeLaCorte', 'Ordenes de la corte', 'Fecha');
        cy.contains('button', 'Select all').click();
        cy.contains('button', 'Next').click();
        checkTemplatesList([
          'Ordenes de la corte',
          'Informe de admisibilidad',
          'Ordenes del presidente',
          'Sentencia de la corte',
        ]);
        cy.contains('button', 'Create').click();
      });
      cy.contains('td', 'Fechas from relevant templates');
      cy.contains('button', 'Dismiss').click();
    });

    it('should edit Extractor 1', () => {
      cy.get('tbody > tr')
        .eq(0)
        .within(() => {
          cy.get('td').eq(0).get('input').click();
        });
      cy.contains('button', 'Edit Extractor').click();
      cy.getByTestId('modal').within(() => {
        cy.get('input[id="extractor-name"]').type(' edited', { delay: 0 });
        cy.get('label[for="filter_true"]').click();
        editPropertyForExtractor('ordenesDeLaCorte', 'Ordenes de la corte', 'Title');
        editPropertyForExtractor('causa', 'Causa', 'Title', false);
        cy.contains('button', 'Next').click();
        checkTemplatesList(['Ordenes de la corte', 'Ordenes del presidente']);
        cy.contains('button', 'Update').click();
      });
      cy.contains('td', 'Extractor 1 edited');
      cy.contains('button', 'Dismiss').click();
    });

    it('should be able to filter templates', () => {
      cy.contains('button', 'Create Extractor').click();
      cy.getByTestId('modal').within(() => {
        cy.get('input[id="search-multiselect"]').type('ordenes', { delay: 0 });
        cy.contains('Ordenes de la corte');
        cy.contains('Ordenes del presidente');
        cy.contains('Cause').should('not.exist');
        cy.get('input[id="search-multiselect"]').clear();
        cy.contains('Cause').should('not.exist');
        cy.contains('button', 'Cancel').click();
      });
    });

    it('should not be able to edit when selecting multiple extractors', () => {
      cy.contains('label', 'Select all').within(() => {
        cy.get('input').click();
      });
      cy.contains('button', 'Edit Extractor').should('not.exist');
    });

    it('should delete an extractor', () => {
      cy.contains('label', 'Select all').within(() => {
        cy.get('input').click();
      });

      cy.get('tbody > tr')
        .eq(2)
        .within(() => {
          cy.get('td').eq(0).get('input').click();
        });

      cy.contains('button', 'Delete').click();

      cy.getByTestId('modal').within(() => {
        cy.contains('li', 'Titles from all templates');
        cy.contains('button', 'Accept').click();
      });

      cy.contains('td', 'Titles from all templates').should('not.exist');
      cy.contains('button', 'Dismiss').click();
    });

    it('should check table display and accessibility', () => {
      cy.getByTestId('settings-ix').toMatchImageSnapshot();
      cy.checkA11y();
    });

    it('should disable buttons while saving', () => {
      cy.intercept('POST', '/api/ixextractors', { delay: 100 });
      cy.contains('button', 'Create Extractor').click();
      cy.getByTestId('modal').within(() => {
        cy.get('input[id="extractor-name"]').type('Extractor 1', { delay: 0 });
        editPropertyForExtractor('firstTemplate', 'Ordenes del presidente', 'Title');
        cy.contains('button', 'Next').click();
        cy.contains('button', 'Create').click();
      });

      cy.contains('button', 'Create Extractor').should('have.attr', 'disabled');
      cy.contains('button', 'Dismiss').click();
    });
  });

  describe('Suggestions review', () => {
    before(() => {
      cy.injectAxe();
    });

    it('should navigate to the first extractor', () => {
      cy.contains('button', 'Review').eq(0).click();
    });

    it('should sort by the document column', () => {
      cy.get('tbody tr').eq(5).should('be.visible');
      cy.contains('th', 'Document').click();
      cy.contains('Uwazi Heroes Investigation', { timeout: 100 });
      cy.get('tbody').within(() => {
        cy.get('tr').eq(5).contains('Uwazi Heroes Investigation');
        cy.get('tr')
          .eq(0)
          .contains(
            'Apitz Barbera y otros. Resolución de la Presidenta de 18 de diciembre de 2009'
          );
      });
    });

    it('should display suggestions and be accessible', () => {
      cy.contains('Extractor 1 edited');
      cy.getByTestId('settings-ix').scrollTo('top', { ensureScrollable: false });
      cy.getByTestId('settings-content').toMatchImageSnapshot({
        disableTimersAndAnimations: true,
        threshold: 0.08,
      });
      cy.checkA11y();
    });

    it('should find suggestions successfully', () => {
      cy.intercept('POST', 'api/suggestions/train').as('trainSuggestions');
      cy.get('table tr').should('have.length.above', 1);
      cy.checkA11y();
      cy.contains('button', 'Find suggestions').click();
      cy.wait('@trainSuggestions');
      cy.contains('Training model...');
      cy.contains('2023');
    });

    it('should accept a single suggestion without affecting the order', () => {
      cy.contains('tr', 'Lorem Ipsum').contains('button', 'Accept').click();

      cy.contains('Suggestion accepted.');
      cy.contains('button', 'Dismiss').click();

      const titles = [
        'Apitz Barbera y otros. Resolución de la Presidenta de 18 de diciembre de 2009 (en)',
        'Batman v Superman: Dawn of Justice (en)',
        '2023 (en)',
        'Spider-Man: Shattered Dimensions (en)',
        'The Spectacular Spider-Man (en)',
        'Uwazi Heroes Investigation (other)',
      ];

      cy.get('tr > td:nth-child(2) > div').each((element, index) => {
        const text = element.get(0).innerText;
        expect(text).to.be.equal(`${titles[index]}`);
      });

      cy.checkA11y();
    });

    it('should use filters', () => {
      cy.intercept('GET', 'api/suggestions*').as('getSuggestions');
      cy.contains('button', 'Stats & Filters').click();
      cy.checkA11y();
      cy.contains('span', 'Match').click();
      cy.contains('button', 'Apply').click();
      cy.wait('@getSuggestions');
      cy.get('tbody tr').should('have.length', 1);
    });
  });

  describe('PDF sidepanel', () => {
    it('should display the PDF sidepanel with the pdf and selection rectangle', () => {
      cy.contains('button', 'Open PDF').click();
      cy.contains('h1', '2023');
      cy.get('aside').within(() => {
        cy.get('input').should('have.value', '2023');
      });
      cy.get('div.highlight-rectangle').should('be.visible');
      cy.contains('span', 'Lorem Ipsum');
    });

    it('should not render pdf pages that are not visible', () => {
      cy.get('[data-region-selector-id="2"]').within(() => {
        cy.get('div').should('be.empty');
      });
    });

    it('should clear the existing selection', () => {
      cy.contains('[data-testid="ix-clear-button-container"] button', 'Clear').click();
      cy.get('div.highlight-rectangle').should('have.length', 0);
    });

    it('should clear the filters', () => {
      cy.contains('button', 'Cancel').click();
      cy.contains('button', 'Stats & Filters').click();
      cy.contains('button', 'Clear all').click();
    });

    it('should click to fill with a new text', () => {
      cy.contains('The Spectacular Spider-Man').parent().siblings().last().click();
      cy.get('aside').within(() => {
        cy.get('input').clear();
      });
      cy.get('#pdf-container').scrollTo(0, 0);
      cy.contains('button', 'Clear').click();
      cy.contains('span[role="presentation"]', 'The Spectacular Spider-Man')
        .eq(0)
        .setSelection('The Spectacular Spider-Man');

      cy.contains('button', 'Click to fill').click();
      cy.get('div.highlight-rectangle').should('be.visible');
      cy.get('aside').within(() => {
        cy.get('input').should('have.value', 'The Spectacular Spider-Man');
      });
    });

    it('should manually edit the field and save', () => {
      cy.get('aside').within(() => {
        cy.get('input').clear();
        cy.get('input').type('A title', { delay: 0 });
        cy.contains('button', 'Accept').click();
      });
      cy.contains('Saved successfully');
      cy.contains('button', 'Dismiss').click();
      cy.contains('A title');
    });

    it('should check that the table updated and the ordering is not affected', () => {
      const titles = [
        '2023 (en)',
        'Apitz Barbera y otros. Resolución de la Presidenta de 18 de diciembre de 2009 (en)',
        'Batman v Superman: Dawn of Justice (en)',
        'Spider-Man: Shattered Dimensions (en)',
        'A title (en)',
        'Uwazi Heroes Investigation (other)',
      ];

      cy.get('tr > td:nth-child(2) > div').each((element, index) => {
        const text = element.get(0).innerText;
        expect(text).to.be.equal(`${titles[index]}`);
      });
    });

    it('should open the pdf on the page of the selection', () => {
      cy.contains('a', 'Metadata Extraction').eq(0).click();
      cy.contains('Fechas from relevant templates').siblings().last().click();
      cy.contains('Apitz Barbera y otros. Resolución de la Presidenta de 18 de diciembre de 2009')
        .parent()
        .siblings()
        .last()
        .click();
      cy.get('aside').within(() => {
        cy.get('input').should('have.value', '2018-12-01');
        cy.contains('New York City teenager Miles Morales');
      });
    });
  });
});
