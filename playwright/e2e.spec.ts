import { test, expect } from '@playwright/test';

// ─── E2E 25.1: Login flow and role-based redirect ─────────────────────────────

test.describe('Login and role redirect', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/operator/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows login form elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Masuk ke Platform')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();
  });

  test('shows sign-up link on login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Daftar di sini')).toBeVisible();
  });

  test('navigates to signup page', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Daftar di sini').click();
    await expect(page).toHaveURL(/\/signup/);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill('wrong@example.com');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: 'Masuk' }).click();
    await expect(page.getByText(/salah|gagal|terkunci/i)).toBeVisible({ timeout: 10000 });
  });
});

// ─── E2E 25.2: Signup form validation ────────────────────────────────────────

test.describe('Signup form', () => {
  test('shows all required fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('Buat Akun')).toBeVisible();
    await expect(page.getByLabel('Nama Lengkap')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByLabel('Role')).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/signup');
    await page.getByRole('button', { name: 'Daftar' }).click();
    await expect(page.getByText(/karakter/i)).toBeVisible();
  });

  test('shows password length validation', async ({ page }) => {
    await page.goto('/signup');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Daftar' }).click();
    await expect(page.getByText(/minimal 8/i)).toBeVisible();
  });
});

// ─── E2E 25.4: Route-level RBAC ──────────────────────────────────────────────

test.describe('Role-based access control', () => {
  test('operator route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/operator/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('manager route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/manager/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin users route redirects unauthenticated user', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin audit route redirects unauthenticated user', async ({ page }) => {
    await page.goto('/admin/audit');
    await expect(page).toHaveURL(/\/login/);
  });
});
