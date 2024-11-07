/* eslint-disable max-lines */
import { clearCookiesAndLogin } from './helpers/login';
import { changeLanguage } from './helpers/language';
import { clickOnCreateEntity, clickOnEditEntity } from './helpers/entities';

const filesAttachments = ['./cypress/test_files/valid.pdf', './cypress/test_files/batman.jpg'];

const entityTitle = 'Entity with supporting files';
const textWithHtml = `<h1>The title</h1>
  <a href="https://duckduckgo.com/" target="_blank">
    I am a link to an external site
  </a>
  <br />
  <a href="/entity/6z2x77oi2yyqr529">
    I am a link to the Tracy Robinson entity
  <a/>
  <ol class="someClass">
    <li>List item 1</li>
    <li>List item 2</li>
  </ol>`;

const webAttachments = {
  name: 'Resource from web',
  url: 'https://fonts.googleapis.com/icon?family=Material+Icons',
};

const goToRestrictedEntities = () => {
  cy.contains('a', 'Library').click();
  cy.get('#publishedStatuspublished').then(element => {
    const publishedStatus = element.val();
    cy.get('#publishedStatusrestricted').then(restrictedElement => {
      const restrictedStatis = restrictedElement.val();

      if (publishedStatus) {
        cy.get('[title="Published"]').click();
      }

      if (!restrictedStatis) {
        cy.get('[title="Restricted"]').click();
      }
    });
  });
};

describe('Entities', () => {
  before(() => {
    const env = { DATABASE_NAME: 'uwazi_e2e', INDEX_NAME: 'uwazi_e2e' };
    cy.exec('yarn e2e-fixtures', { env });
    clearCookiesAndLogin();
  });

  const saveEntity = (message = 'Entity created') => {
    cy.contains('button', 'Save').click();
    cy.contains(message);
  };

  it('Should create new entity', () => {
    clickOnCreateEntity();
    cy.get('[name="library.sidepanel.metadata.title"]').click();
    cy.get('[name="library.sidepanel.metadata.title"]').type('Test entity', { delay: 0 });
    saveEntity();
  });

  describe('Rich text fields', () => {
    it('should create an entity with HTML on a rich text field', () => {
      clickOnCreateEntity();
      cy.get('[name="library.sidepanel.metadata.title"]').click();
      cy.get('[name="library.sidepanel.metadata.title"]').type('Entity with HTML', { delay: 0 });
      cy.get('#metadataForm').find('select').select('Reporte', { timeout: 100 });

      cy.get('#tabpanel-edit > textarea').type(textWithHtml, { delay: 0 });
      saveEntity();
    });

    it('should check that the HTML is show as expected', () => {
      cy.contains('h1', 'The title').should('exist');
      cy.contains('a', 'I am a link to an external site').should('exist');
      cy.contains('.someClass > li:nth-child(1)', 'List item 1').should('exist');
      cy.contains('.someClass > li:nth-child(2)', 'List item 2').should('exist');
    });

    it('should navigate to an entity via the rich text field link', () => {
      cy.contains('a', 'I am a link to the Tracy Robinson entity').click();
      cy.contains('.content-header-title > h1:nth-child(1)', 'Tracy Robinson').should('exist');
    });
  });

  describe('Entity with files in metadata fields', () => {
    it('should create and entity with and image in a metadata field', () => {
      goToRestrictedEntities();
      clickOnCreateEntity();
      cy.get('[name="library.sidepanel.metadata.title"]').click();
      cy.get('[name="library.sidepanel.metadata.title"]').type('Entity with media files', {
        delay: 0,
      });
      cy.get('#metadataForm').find('select').select('Reporte', { force: true });
      cy.get('#tabpanel-edit > textarea').type('A description of the report', { delay: 0 });
      cy.get(
        '#metadataForm > div:nth-child(3) > div:nth-child(4) > ul > li.wide > div > div > div > button'
      ).click();
      cy.get('input[aria-label=fileInput]').first().selectFile('./cypress/test_files/batman.jpg', {
        force: true,
      });
      saveEntity();
    });

    it('should edit the entity to add a video on a metadata field', () => {
      cy.contains('.item-document', 'Entity with media files').click();
      clickOnEditEntity();
      cy.get(
        '#metadataForm > div:nth-child(3) > div.form-group.media > ul > li.wide > div > div > div > button'
      ).click();
      cy.contains('Select from computer');
      cy.get('input[aria-label=fileInput]')
        .first()
        .selectFile('./cypress/test_files/short-video.webm', {
          force: true,
          timeout: 100,
        });
      saveEntity('Entity updated');
    });

    it('should check the entity', () => {
      cy.get('.sidepanel-body.scrollable').scrollTo('top');
      cy.get('.metadata-sidepanel.is-active .closeSidepanel').click();
      goToRestrictedEntities();
      cy.contains('.item-name span', 'Entity with media files').click();
      cy.get('.metadata-name-descripci_n > dd > div > p').should(
        'contain.text',
        'A description of the report'
      );

      cy.get('.metadata-name-fotograf_a > dd > img')
        .should('have.prop', 'src')
        .and('match', /\w+\/api\/files\/\w+\.jpg$/);
      cy.get('.metadata-sidepanel .sidepanel-body').scrollTo('bottom');
      cy.get('.metadata-name-video > dd > div > div > div > div:nth-child(1) > div > video')
        .should('have.prop', 'src')
        .and('match', /^blob:http:\/\/localhost:3000\/[\w-]+$/);
      const expectedNewEntityFiles = ['batman.jpg', 'short-video.webm'];
      cy.get('.attachment-name span:not(.attachment-size)').each((element, index) => {
        const content = element.text();
        cy.wrap(content).should('eq', expectedNewEntityFiles[index]);
      });
    });
  });

  describe('supporting files and main documents', () => {
    describe('Entity with supporting files', () => {
      it('Should create a new entity with supporting files', () => {
        cy.get('.metadata-sidepanel.is-active .closeSidepanel').click();
        goToRestrictedEntities();
        clickOnCreateEntity();
        cy.contains('button', 'Add file').click();
        cy.get('#tab-uploadComputer').click();
        cy.get('input[aria-label="fileInput"]').first().selectFile(filesAttachments[0], {
          force: true,
        });
        cy.contains('button', 'Add file').click();
        cy.get('#tab-uploadComputer').click();
        cy.get('input[aria-label="fileInput"]').first().selectFile(filesAttachments[1], {
          force: true,
        });
        clickOnCreateEntity();
        cy.get('[name="library.sidepanel.metadata.title"]').click();
        cy.get('[name="library.sidepanel.metadata.title"]').type(entityTitle, {
          delay: 0,
        });
        cy.contains('button', 'Add file').click();
        cy.get('#tab-uploadComputer').click();
        cy.get('input[aria-label="fileInput"]').first().selectFile(filesAttachments[0], {
          force: true,
        });
        cy.contains('button', 'Add file').click();
        cy.get('#tab-uploadComputer').click();
        cy.get('input[aria-label="fileInput"]').first().selectFile(filesAttachments[1], {
          force: true,
        });
        cy.contains('button', 'Add file').click();
        cy.contains('.tab-link', 'Add from web').click();
        cy.get('.web-attachment-url').click();
        cy.get('.web-attachment-url').type(webAttachments.url, { delay: 0 });
        cy.get('.web-attachment-name').click();
        cy.get('.web-attachment-name').type(webAttachments.name, { delay: 0 });
        cy.contains('button', 'Add from URL').click();

        cy.contains('button', 'Save').click();
        cy.contains('.item-document', entityTitle).click();
        const expectedNewFiles = ['batman.jpg', 'Resource from web', 'valid.pdf'];
        cy.get('.attachment-name span:not(.attachment-size)').each((element, index) => {
          const content = element.text();
          cy.wrap(content).should('eq', expectedNewFiles[index]);
        });
      });

      it('should rename a supporting file', () => {
        cy.contains('.item-document', entityTitle).click();
        clickOnEditEntity();
        cy.get('input[name="library.sidepanel.metadata.attachments.2.originalname"]').clear();
        cy.get('input[name="library.sidepanel.metadata.attachments.2.originalname"]').type(
          'My PDF.pdf',
          { delay: 0 }
        );
        cy.contains('button', 'Save').click();
        cy.contains('.item-document', entityTitle).click();
        const expectedRenamedFiles = ['batman.jpg', 'My PDF.pdf', 'Resource from web'];
        cy.get('.attachment-name span:not(.attachment-size)').each((element, index) => {
          const content = element.text();
          cy.wrap(content).should('eq', expectedRenamedFiles[index]);
        });
      });

      it('should delete the first supporting file', () => {
        cy.contains('.item-document', entityTitle).click();
        clickOnEditEntity();
        cy.get('.delete-supporting-file').eq(0).click();
        cy.contains('button', 'Save').click();
        cy.contains('.item-document', entityTitle).click();
        const expectedSupportingFiles = ['My PDF.pdf', 'Resource from web'];
        cy.get('.attachment-name span:not(.attachment-size)').each((element, index) => {
          const content = element.text();
          cy.wrap(content).should('eq', expectedSupportingFiles[index]);
        });
      });
    });

    describe('Entity with main documents', () => {
      it('Should create a new entity with a main documents', () => {
        cy.get('.metadata-sidepanel.is-active .closeSidepanel').click();
        goToRestrictedEntities();
        clickOnCreateEntity();
        cy.get('textarea[name="library.sidepanel.metadata.title"]').click();
        cy.get('textarea[name="library.sidepanel.metadata.title"]').type(
          'Entity with main documents',
          { delay: 0 }
        );
        cy.get('input[name="library.sidepanel.metadata.metadata.resumen"]').click();
        cy.get('input[name="library.sidepanel.metadata.metadata.resumen"]').type(
          'An entity with main documents',
          { delay: 0 }
        );
        cy.get('.document-list-parent > input')
          .first()
          .selectFile('./cypress/test_files/valid.pdf', {
            force: true,
          });
        saveEntity();
      });

      it('should create a reference from main document', () => {
        cy.contains('a', 'Library').click();
        cy.contains('.item-document', 'Entity with main documents').within(() => {
          cy.get('.view-doc').click();
        });
        cy.contains('span', 'La Sentencia de fondo');
        cy.get('#p3R_mc24 > span:nth-child(2)').realClick({ clickCount: 3 });
        cy.get('.fa-file', { timeout: 5000 }).then(() => {
          cy.get('.fa-file').realClick();
        });
        cy.contains('.create-reference li:nth-child(1) span:nth-child(2)', 'Relacionado a').click({
          timeout: 5000,
        });
        cy.get('aside.create-reference input').type('Patrick Robinson', { timeout: 5000 });
        cy.contains('Tracy Robinson', { timeout: 5000 });
        cy.contains('.item-name', 'Patrick Robinson', { timeout: 5000 }).click();
        cy.contains('aside.create-reference .btn-success', 'Save', { timeout: 5000 }).click({
          timeout: 5000,
        });
        cy.contains('Saved successfully.');
        cy.get('#p3R_mc0').scrollIntoView();
        cy.get('#p3R_mc24 > span:nth-child(2)').toMatchImageSnapshot();
        cy.get('.relationship-active').toMatchImageSnapshot();
      });

      it('should edit the entity and the documents', () => {
        cy.contains('a', 'Library').click();
        cy.contains('.item-document', 'Entity with main documents').click();
        cy.contains('.metadata-type-text', 'An entity with main documents').click();
        clickOnEditEntity();
        cy.get('input[name="library.sidepanel.metadata.documents.0.originalname"]').click();
        cy.get('input[name="library.sidepanel.metadata.documents.0.originalname"]').clear();
        cy.get('input[name="library.sidepanel.metadata.documents.0.originalname"]').type(
          'Renamed file.pdf',
          { delay: 0 }
        );
        cy.get('.document-list-parent > input')
          .first()
          .selectFile('./cypress/test_files/invalid.pdf', {
            force: true,
          });
        saveEntity('Entity updated');
        cy.contains('.item-document', 'Entity with main documents').click();
        cy.contains('.file-originalname', 'Renamed file.pdf').should('exist');
        cy.contains('.file-originalname', 'invalid.pdf').should('exist');
      });

      it('should delete the invalid document', () => {
        clickOnEditEntity();
        cy.get('.attachments-list > .attachment:nth-child(2) > button').click();
        cy.contains('button', 'Save').click();
        cy.contains('Entity updated').as('successMessage');
        cy.get('@successMessage').should('not.exist');
        cy.contains('.item-document', 'Entity with main documents').click();
        cy.contains('.file-originalname', 'Renamed file.pdf').should('exist');
        cy.contains('.file-originalname', 'invalid.pdf').should('not.exist');
      });

      it('should keep searched text between tabs', () => {
        cy.clearAndType(
          'input[aria-label="Type something in the search box to get some results."]',
          '"4 de julio de 2006"',
          { delay: 0 }
        );
        cy.get('svg[aria-label="Search button"]').click();
        cy.contains('.item-snippet', '4 de julio de 2006').should('have.length', 1);
        cy.contains('.item-document .item-actions a', 'View').click();
        cy.contains('VISTO');
        cy.get('.snippet-text').should('have.length', 2);
        cy.get('#tab-metadata').click();
        cy.get('.entity-sidepanel-tab-link').then(element => {
          expect(element.attr('href')).to.contain('searchTerm=%224%20de%20julio%20de%202006%22');
        });
        cy.contains('a', 'Library').click();
        cy.get('svg[aria-label="Reset Search input"]').click();
      });
    });
  });

  describe('Languages', () => {
    it('should change the entity in Spanish', () => {
      changeLanguage('Español');
      cy.contains('.item-document', 'Test entity').click();
      clickOnEditEntity('Editar');
      cy.get('textarea[name="library.sidepanel.metadata.title"]').click();
      cy.clearAndType('textarea[name="library.sidepanel.metadata.title"]', 'Título de prueba', {
        delay: 0,
      });
      cy.get('input[name="library.sidepanel.metadata.metadata.resumen"]').click();
      cy.clearAndType(
        'input[name="library.sidepanel.metadata.metadata.resumen"]',
        'Resumen en español',
        { delay: 0 }
      );
      cy.contains('.multiselectItem-name', 'Argentina').click();
      cy.contains('button', 'Guardar').click();
    });

    it('should check the values for the entity in Spanish', () => {
      cy.contains('.item-document', 'Título de prueba').click();
      cy.contains('h1.item-name', 'Título de prueba').should('exist');
      cy.contains('.metadata-type-text > dd', 'Resumen en español').should('exist');
      cy.contains('.multiline > .item-value > a', 'Argentina').should('exist');
    });

    it('should edit the text field in English', () => {
      changeLanguage('English');
      cy.contains('.item-document', 'Test entity').click();
      clickOnEditEntity();
      cy.get('input[name="library.sidepanel.metadata.metadata.resumen"]').click();
      cy.get('input[name="library.sidepanel.metadata.metadata.resumen"]').type('Brief in English', {
        delay: 0,
      });
      cy.contains('button', 'Save').click();
      cy.contains('Entity updated');
      cy.contains('.item-document', 'Test entity').click();
      cy.contains('.metadata-type-text > dd', 'Brief in English').should('exist');
      cy.contains('.multiline > .item-value > a', 'Argentina').should('exist');
    });

    it('should not affect the text field in Spanish', () => {
      changeLanguage('Español');
      cy.contains('.item-document', 'Título de prueba').click();
      cy.contains('.metadata-type-text > dd', 'Resumen en español').should('exist');
    });
  });

  describe('new thesauri values shortcut', () => {
    before(() => {
      changeLanguage('English');
      cy.get('li[title=Published]').click();
      cy.contains(
        'Artavia Murillo y otros. Resolución de la Corte IDH de 31 de marzo de 2014'
      ).click();
      clickOnEditEntity();
    });

    it('should add a thesauri value on a multiselect field and select it', () => {
      cy.get(
        '#metadataForm > div:nth-child(3) > .form-group.multiselect > ul > .wide > div > div > button > span'
      ).scrollIntoView();
      cy.contains(
        '#metadataForm > div:nth-child(3) > .form-group.multiselect > ul > .wide > div > div > button > span',
        'add value'
      )
        .parent()
        .click();
      cy.contains('.modal-content', 'Add thesaurus value');
      cy.get('input[name=value]#newThesauriValue').type('New Value', {
        delay: 0,
      });
      cy.contains('.file-form button.confirm-button', 'Save').click();
      cy.contains(
        '#metadataForm > div:nth-child(3) > .form-group.multiselect > ul > .wide > div > ul > li:nth-child(4) > label > .multiselectItem-name',
        'New Value'
      ).should('exist');
      const expectedMultiselect = [
        'De asunto',
        'Medidas Provisionales',
        'New Value',
        'Excepciones Preliminares',
        'Fondo',
      ];
      cy.get(
        '#metadataForm > div:nth-child(3) > .form-group.multiselect > ul > li.wide > div > ul > li > label > .multiselectItem-name'
      ).each((element, index) => {
        const content = element.text();
        cy.wrap(content).should('eq', expectedMultiselect[index]);
      });
    });

    it('should add a thesauri value on a single select field and select it', () => {
      cy.contains(
        '#metadataForm > div:nth-child(3) > .form-group.select > ul > .wide > div > div > button > span',
        'add value'
      ).click();
      cy.get('input[name=value]#newThesauriValue').click();
      cy.get('input[name=value]#newThesauriValue').type('New Value', {
        delay: 0,
      });
      cy.contains('.confirm-button', 'Save').click();
    });
  });
});
