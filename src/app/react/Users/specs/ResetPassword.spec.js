import React from 'react';
import { shallow } from 'enzyme';

import { ResetPasswordComponent as ResetPassword } from '../ResetPassword';

describe('ResetPassword', () => {
  let component;
  let props;
  let context;

  beforeEach(() => {
    props = {
      resetPassword: jasmine.createSpy('resetPassword').and.returnValue({ then: cb => cb() }),
      params: { key: 'asd' },
      routes: [],
      navigate: jest.fn(),
      location: { search: '' },
      matches: [],
    };

    context = { store: { getState: () => ({}) } };

    component = shallow(<ResetPassword {...props} />, { context });
  });

  describe('When not creating an account', () => {
    it('should render a normal form without any additional information', () => {
      expect(component.find('.alert.alert-info').length).toBe(0);
    });
  });

  describe('When creating an account', () => {
    it('should render an additional information box', () => {
      props.location = { search: '?createAccount=true' };
      component = shallow(<ResetPassword {...props} />, { context });
      expect(component.find('.alert.alert-info').length).toBe(1);
    });
  });

  describe('submit', () => {
    it('should call resetPassword with password and key', () => {
      component.setState({ password: 'ultraSecret', repeatPassword: 'ultraSecret' });
      component.find('form').simulate('submit', { preventDefault: () => {} });
      expect(props.resetPassword).toHaveBeenCalledWith('ultraSecret', 'asd');
    });

    it('should redirect to login upon success', () => {
      component.setState({ password: 'ultraSecret', repeatPassword: 'ultraSecret' });
      component.find('form').simulate('submit', { preventDefault: () => {} });
      expect(props.navigate).toHaveBeenCalledWith('/login');
    });

    it('should empty the passwords values', () => {
      component.setState({ password: 'ultraSecret', repeatPassword: 'ultraSecret' });
      component.find('form').simulate('submit', { preventDefault: () => {} });
      expect(component.instance().state.password).toBe('');
      expect(component.instance().state.repeatPassword).toBe('');
    });

    describe('when passwords do not match', () => {
      it('should not update it', () => {
        component.setState({ password: 'ultraSecret', repeatPassword: 'IDontKnowWhatIAmDoing' });
        component.find('form').simulate('submit', { preventDefault: () => {} });
        expect(props.resetPassword).not.toHaveBeenCalled();
      });

      it('should display an error', () => {
        component.setState({ password: 'ultraSecret', repeatPassword: 'IDontKnowWhatIAmDoing' });
        component.find('form').simulate('submit', { preventDefault: () => {} });
        expect(component.find('form').childAt(0).hasClass('has-error')).toBe(true);
        expect(component.find('form').childAt(1).hasClass('has-error')).toBe(true);
      });
    });
  });
});
