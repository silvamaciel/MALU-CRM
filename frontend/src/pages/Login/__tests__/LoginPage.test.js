// frontend/src/pages/Login/__tests__/LoginPage.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter as Router } from 'react-router-dom'; // For Link components if any, or useNavigate
import LoginPage from '../LoginPage';
import * as authApi from '../../../api/auth'; // To mock loginUserApi
import { ToastContainer } from 'react-toastify';

// Mock the authApi.loginUserApi function
jest.mock('../../../api/auth', () => ({
  ...jest.requireActual('../../../api/auth'), // Import and retain other exports
  loginUserApi: jest.fn(),
  // Mock googleLoginApi if LoginPage uses it directly, or mock the component/hook that uses it
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));


describe('LoginPage', () => {
  const mockOnLoginSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn(); // For any initial checks if needed
  });

  const renderComponent = () => {
    render(
      <Router>
        <ToastContainer />
        <LoginPage onLoginSuccess={mockOnLoginSuccess} />
      </Router>
    );
  };

  it('renders login form correctly', () => {
    renderComponent();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    // Check for Google/Facebook login buttons if they are part of LoginPage
    // expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
  });

  it('allows typing in email and password fields', () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/senha/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('calls loginUserApi and onLoginSuccess on successful submission', async () => {
    const mockLoginResponse = {
      token: 'fake-jwt-token',
      user: { _id: '123', nome: 'Test User', email: 'test@example.com', perfil: 'admin', companyId: 'c1' },
    };
    authApi.loginUserApi.mockResolvedValue(mockLoginResponse);

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(authApi.loginUserApi).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith('userToken', mockLoginResponse.token);
        expect(localStorage.setItem).toHaveBeenCalledWith('userData', JSON.stringify(mockLoginResponse.user));
        expect(mockOnLoginSuccess).toHaveBeenCalledTimes(1);
        // expect(mockNavigate).toHaveBeenCalledWith('/dashboard'); // Navigation is handled by App.js based on isLoggedIn state
    });
  });

  it('shows an error toast if email is not provided', async () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    // Check for toast message
    // This requires react-toastify to be rendered and for its messages to be accessible
    // For simplicity, we'll check that the API was NOT called and onLoginSuccess was NOT called.
    // A more robust test would use something like `screen.findByText` for the toast message.
    await waitFor(() => {
        expect(screen.getByText(/email e senha são obrigatórios/i)).toBeInTheDocument();
      });
    expect(authApi.loginUserApi).not.toHaveBeenCalled();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });


  it('shows an error toast if loginUserApi rejects', async () => {
    authApi.loginUserApi.mockRejectedValue({ error: 'Invalid credentials' });
    renderComponent();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/senha/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(authApi.loginUserApi).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    // Wait for the error message to appear (e.g., in a toast or an error display area)
    // This depends on how LoginPage displays errors. Assuming it uses toast.error from the API call's catch block.
    // The actual text might come from the API error or a generic message in LoginPage.
    await waitFor(() => {
        // This checks if the toast is rendered in the document.
        // The exact text depends on the error handling in LoginPage.
        // If LoginPage itself calls toast.error(err.error), this should work.
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
    });
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  // TODO: Add tests for Google login if LoginPage handles it directly
  // (e.g., mocking @react-oauth/google's useGoogleLogin hook or GoogleLogin component behavior)
  // For now, assuming Google/Facebook login might be separate components or handled differently.
});
