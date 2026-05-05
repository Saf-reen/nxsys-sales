import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import InputField from '@/components/auth/InputField';
import PasswordInput from '@/components/auth/PasswordInput';
import AuthButton from '@/components/auth/AuthButton';
import { authService } from '@/services';
import { getNormalizedApiError } from '@/services';
import { showToast } from '../../utils/helpers';
import { rfqIntentService } from '@/services';
import { isAdminUser } from '@/utils/access';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: '', // email or username
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [errorType, setErrorType] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, any>>({});

  const isAdminHint = location.pathname.startsWith('/admin') || formData.username.includes('admin') || formData.username === 'admin@test.com';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formError) {
      setFormError('');
    }

    if (errorType) {
      setErrorType('');
    }

    setFieldErrors((prev) => ({
      ...prev,
      [name]: '',
      ...(name === 'username' ? { email: '' } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    setErrorType('');
    setFieldErrors({});

    try {
      const { user } = await authService.login({
        username: formData.username,
        email: formData.username.includes('@') ? formData.username : undefined,
        password: formData.password,
      });

      const safeUser = user || { name: 'User', role: 'customer' };

      showToast({ 
        title: `Welcome back, ${safeUser.name}!`, 
        message: `You are logged in as ${safeUser.role}.` 
      });

      if (isAdminUser(safeUser)) {
        navigate('/admin/dashboard');
      } else {
        const pendingRFQIntent = rfqIntentService.get();
        if (pendingRFQIntent?.path) {
          // Navigate back to the product page. The product page will:
          //   1. Detect location.state.openRFQ === true
          //   2. Open the modal automatically
          //   3. Clear the intent itself (rfqIntentService.clear() on ProductDetails line 106)
          navigate(pendingRFQIntent.path, {
            state: { openRFQ: true },
          });
          return;
        }
        const from = location.state?.from?.pathname || '/';
        navigate(from, { state: location.state }); // Pass location state to re-trigger RFQ if needed
      }
    } catch (err) {
      const normalizedError = getNormalizedApiError(err, {
        fallbackMessage: 'Login failed',
      });

      const nextFieldErrors: Record<string, any> = {};
      const usernameError = normalizedError.fieldErrors.username || normalizedError.fieldErrors.email;

      if (usernameError) {
        nextFieldErrors.username = usernameError;
      }

      if (normalizedError.fieldErrors.password) {
        nextFieldErrors.password = normalizedError.fieldErrors.password;
      }

      setFieldErrors(nextFieldErrors);
      setErrorType(normalizedError.type);
      setFormError(normalizedError.message);

      if (normalizedError.type === 'server') {
        showToast({ title: 'Login failed', message: normalizedError.message, type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const highlightCredentials = Boolean(formError) && errorType === 'auth';

  return (
    <AuthLayout
      badge={isAdminHint ? 'Admin Access' : 'Welcome Back'}
      title={isAdminHint ? 'Admin Sign In' : 'Sign In to Your Account'}
      subtitle={isAdminHint ? 'Platform management console' : 'Enter your credentials to continue shopping and track your orders.'}
      imageText={isAdminHint ? 'Platform control.' : 'Shop smarter, order faster.'}
      imageSubtitle={isAdminHint ? 'Operate the enterprise engine behind the storefront.' : 'Browse thousands of products, request quotes, and manage your orders all in one place.'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
            {formError}
          </div>
        ) : null}

        <InputField
          label="Email or Username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          placeholder="yourname@example.com"
          required
          autoComplete="username"
          error={fieldErrors.username}
          invalid={highlightCredentials || Boolean(fieldErrors.username)}
        />
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Password <span className="text-rose-400">*</span>
            </span>
            <Link to="/forgot-password" className="text-[11px] font-semibold text-primary transition-opacity hover:opacity-80">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            error={fieldErrors.password}
            invalid={highlightCredentials || Boolean(fieldErrors.password)}
          />
        </div>

        <AuthButton loading={submitting} type="submit" className="mt-4">
          Sign In to Portal
        </AuthButton>

        {!isAdminHint && (
          <p className="mt-6 text-center text-[13px] text-slate-500">
            New partner?{' '}
            <Link to="/register" className="font-bold text-primary transition-opacity hover:opacity-80">
              Create Account
            </Link>
          </p>
        )}
      </form>
    </AuthLayout>
  );
};

export default Login;
