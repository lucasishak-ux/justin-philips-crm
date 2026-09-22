/* Justin Philips CRM - Safari/iPhone login fix */
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('loginForm');
  const emailEl = document.getElementById('email');
  const passEl = document.getElementById('password');
  const errorEl = document.getElementById('loginError');
  const loginEl = document.getElementById('login');
  const appEl = document.getElementById('app');
  if (!form || !emailEl || !passEl || !window.supabase) return;

  const client = window.supabase.createClient(
    'https://mclyuqhltbrhqzgalcuy.supabase.co',
    'sb_publishable_bZGkBsFcCDEtVYQ-8FhQSQ_G8wc7IS5'
  );

  form.onsubmit = null;
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (errorEl) errorEl.textContent = 'Bezig met inloggen…';
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: emailEl.value.trim(),
        password: passEl.value
      });
      if (error) {
        if (errorEl) errorEl.textContent = 'Inloggen mislukt: ' + error.message;
        return false;
      }
      if (!data.session) {
        if (errorEl) errorEl.textContent = 'Geen geldige sessie ontvangen.';
        return false;
      }
      if (errorEl) errorEl.textContent = '';
      window.location.reload();
    } catch (err) {
      if (errorEl) errorEl.textContent = 'Technische fout: ' + (err.message || String(err));
    }
    return false;
  }, true);
});
