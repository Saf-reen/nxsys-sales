import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import InputField from '@/components/auth/InputField';
import PasswordInput from '@/components/auth/PasswordInput';
import AuthButton from '@/components/auth/AuthButton';
import { authService } from '@/services';
import { getNormalizedApiError } from '@/services';
import { showToast } from '../../utils/helpers';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullname: '',
    company_name: '',
    company_address: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [formError, setFormError] = useState('');

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullname.trim()) newErrors.fullname = 'Full Name is required';
    if (!formData.company_name.trim()) newErrors.company_name = 'Company Name is required';
    if (!formData.company_address.trim()) newErrors.company_address = 'Company Address is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (formError) setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setFormError('');

    try {
      // Map fields to what the Django backend likely expects (snake_case)
      const payload = {
        email: formData.email,
        password: formData.password,
        full_name: formData.fullname,
        fullname: formData.fullname, 
        phone_number: formData.phone,
        phone: formData.phone, 
        company_name: formData.company_name,
        company_address: formData.company_address,
      };

      await authService.register(payload);
      showToast({ title: 'Signup successful', message: 'Check your email for the verification code.' });
      navigate('/verify-email-otp', { state: { email: formData.email } });
    } catch (err) {
      const normalizedError = getNormalizedApiError(err, {
        fallbackMessage: 'Signup failed',
      });

      setErrors((prev) => ({
        ...prev,
        fullname: normalizedError.fieldErrors.full_name || normalizedError.fieldErrors.fullname || '',
        company_name: normalizedError.fieldErrors.company_name || '',
        company_address: normalizedError.fieldErrors.company_address || '',
        email: normalizedError.fieldErrors.email || '',
        phone: normalizedError.fieldErrors.phone_number || normalizedError.fieldErrors.phone || '',
        password: normalizedError.fieldErrors.password || '',
        confirmPassword: normalizedError.fieldErrors.confirmPassword || '',
      }));
      setFormError(normalizedError.message);

      if (normalizedError.type === 'server') {
        showToast({ title: 'Signup failed', message: normalizedError.message, type: 'error' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      badge="New Account"
      title="Create Your Account"
      subtitle="Fill in your details to get started. It only takes a minute."
      imageText="Everything you need, in one place."
      imageSubtitle="Browse thousands of products, get competitive quotes, and track your orders with ease."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
            {formError}
          </div>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Full Name"
            name="fullname"
            value={formData.fullname}
            onChange={handleChange}
            placeholder="John Doe"
            required
            error={errors.fullname}
          />
          <InputField
            label="Company Name"
            name="company_name"
            value={formData.company_name}
            onChange={handleChange}
            placeholder="Company Name"
            required
            error={errors.company_name}
          />
        </div>

        <InputField
          label="Company Address"
          name="company_address"
          value={formData.company_address}
          onChange={handleChange}
          placeholder="Company Address"
          required
          error={errors.company_address}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Email Address"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="business@example.com"
            required
            error={errors.email}
          />
          <InputField
            label="Phone Number"
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+91 8008008000"
            required
            error={errors.phone}
          />
        </div>

        <PasswordInput
          label="Create Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="        "
          required
          error={errors.password}
        />
        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="        "
          required
          error={errors.confirmPassword}
        />

        <AuthButton loading={submitting} type="submit" className="mt-4">
          Create Account
        </AuthButton>

        <p className="mt-6 text-center text-[13px] text-slate-500">
          Already a partner?{' '}
          <Link to="/login" className="font-bold text-primary transition-opacity hover:opacity-80">
            Sign In
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Register;
