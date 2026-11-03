import { supabase } from './supabase.js';

const $ = (id) => document.getElementById(id);

/**
 * Email + password sign-in dialog. Calls onChange(user | null) whenever the
 * signed-in user changes (including the session restored on page load).
 */
export function setupAuth(onChange) {
  const dialog = $('auth-dialog');
  const form = $('auth-form');
  const message = $('auth-message');
  let mode = 'signin';

  const setMode = (next) => {
    mode = next;
    $('auth-title').textContent = mode === 'signin' ? 'Sign in' : 'Create account';
    $('auth-submit').textContent = mode === 'signin' ? 'Sign in' : 'Create account';
    $('auth-switch').textContent = mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in';
    $('auth-password').autocomplete = mode === 'signin' ? 'current-password' : 'new-password';
    message.textContent = '';
  };

  $('auth-switch').addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));
  $('auth-cancel').addEventListener('click', () => dialog.close());
  $('sign-in').addEventListener('click', () => open());
  $('sign-out').addEventListener('click', () => supabase.auth.signOut());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('auth-email').value.trim();
    const password = $('auth-password').value;
    $('auth-submit').disabled = true;
    message.textContent = '';
    const { data, error } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    $('auth-submit').disabled = false;
    if (error) {
      message.textContent = error.message;
      return;
    }
    if (mode === 'signup' && !data.session) {
      message.textContent = 'Check your email to confirm your account, then sign in.';
      setMode('signin');
      return;
    }
    form.reset();
    dialog.close();
  });

  function open() {
    if (!supabase) return;
    setMode('signin');
    dialog.showModal();
    $('auth-email').focus();
  }

  if (!supabase) {
    $('sign-in').hidden = true;
    onChange(null);
    return { open, available: false };
  }

  // Supabase reports the same session several times (restored on load, signed in,
  // token refreshed, tab focused again); only pass on real changes of user.
  let lastUserId;
  supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user ?? null;
    $('sign-in').hidden = !!user;
    $('user-menu').hidden = !user;
    $('user-email').textContent = user?.email ?? '';
    if ((user?.id ?? null) === lastUserId) return;
    lastUserId = user?.id ?? null;
    // Supabase recommends not awaiting other Supabase calls inside this callback.
    setTimeout(() => onChange(user), 0);
  });

  return { open, available: true };
}
