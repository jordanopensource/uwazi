import React from 'react';
import RouteHandler from 'app/App/RouteHandler';
import backend from 'fetch-mock';
import {APIURL} from '../../config.js';
import 'jasmine-immutablejs-matchers';
import {shallow} from 'enzyme';
import Cookie from 'tiny-cookie';
import Immutable from 'immutable';

class TestController extends RouteHandler {

  static requestState(params) {
    return Promise.resolve({initialData: params.id});
  }
  setReduxState(params) {
    this.setReduxStateCalledWith = params;
  }
  render() {
    return <div></div>;
  }
}

describe('RouteHandler', () => {
  let component;
  let instance;
  let routeParams = {id: '123'};
  let location = {pathname: '', query: 'url query'};
  let languages = [
    {key: 'en', label: 'English', default: true},
    {key: 'es', label: 'Español'}
  ];
  let state = {settings: {collection: Immutable.fromJS({languages: languages})}};
  let context = {store: {getState: () => state, dispatch: jasmine.createSpy('dispatch')}};

  beforeEach(() => {
    backend.restore();
    backend
    .mock(APIURL + 'templates', 'GET', {body: JSON.stringify({rows: []})});
    delete window.__initialData__;

    spyOn(TestController, 'requestState').and.callThrough();

    RouteHandler.renderedFromServer = false;
    component = shallow(<TestController params={routeParams} location={location}/>, {context});
    instance = component.instance();
    instance.constructor = TestController;
  });

  describe('static requestState', () => {
    it('should return a promise with an empty object', (done) => {
      RouteHandler.requestState()
      .then((response) => {
        expect(response).toEqual({});
        done();
      })
      .catch(done.fail);
    });
  });

  describe('on instance', () => {
    it('should request for initialState and setReduxState', (done) => {
      setTimeout(() => {
        expect(TestController.requestState).toHaveBeenCalledWith(routeParams, location.query);
        expect(instance.setReduxStateCalledWith).toEqual({initialData: '123'});
        done();
      });
    });
  });

  describe('componentWillReceiveProps', () => {
    describe('when params change', () => {
      it('should request the clientState', () => {
        spyOn(instance, 'getClientState');
        instance.componentWillReceiveProps({params: {id: '456'}});
        expect(instance.getClientState).toHaveBeenCalledWith({params: {id: '456'}});
      });

      it('should call emptyState', () => {
        spyOn(instance, 'emptyState');
        instance.componentWillReceiveProps({params: {id: '456'}});
        expect(instance.emptyState).toHaveBeenCalled();
      });
    });

    describe('when params are the same', () => {
      it('should NOT request the clientState', () => {
        spyOn(instance, 'getClientState');
        instance.componentWillReceiveProps({params: routeParams});
        expect(instance.getClientState).not.toHaveBeenCalled();
      });
    });
  });

  it('should have a default setReduxState method', () => {
    component = shallow(<RouteHandler/>);
    expect(component.instance().setReduxState).toBeDefined();
  });

  describe('when handling a specific language url', () => {
    it('should set the state.locale to the url language', () => {
      location.pathname = '/es/templates/2452345';
      component = shallow(<RouteHandler location={location}/>, {context});
      expect(context.store.dispatch).toHaveBeenCalledWith({type: 'locale/SET', value: 'es'});
    });
  });

  describe('when the locale isnt at the url', () => {
    describe('on client side', () => {
      it('should set the state.locale to the coockie language', () => {
        location.pathname = '/templates/2452345';
        spyOn(Cookie, 'get').and.returnValue('po');
        component = shallow(<RouteHandler location={location}/>, {context});
        expect(context.store.dispatch).toHaveBeenCalledWith({type: 'locale/SET', value: 'po'});
      });
    });

    describe('on server side', () => {
      it('should set the state.locale to the coockie language', () => {
        location.pathname = '/templates/2452345';
        RouteHandler.locale = 'de';
        Cookie.remove('locale');
        component = shallow(<RouteHandler location={location}/>, {context});
        expect(context.store.dispatch).toHaveBeenCalledWith({type: 'locale/SET', value: 'de'});
        delete RouteHandler.locale;
      });
    });
  });

  describe('when the locale isnt at the url nor the coockie', () => {
    it('should set the state.locale to the thefault language', () => {
      location.pathname = '/templates/2452345';
      Cookie.remove('locale');
      component = shallow(<RouteHandler location={location}/>, {context});
      expect(context.store.dispatch).toHaveBeenCalledWith({type: 'locale/SET', value: 'en'});
    });
  });
});
