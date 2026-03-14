import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import db from '../db';
import { generateToken, getJwtSecret } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';

const router = Router();

// Sign Up
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { loginId, email, password, name } = req.body;

    if (!loginId || !email || !password) {
      return res.status(400).json({ error: 'Login ID, email, and password are required' });
    }

    // Check if user exists
    const existingLoginId = db.prepare('SELECT id FROM users WHERE login_id = ?').get(loginId);
    if (existingLoginId) {
      return res.status(409).json({ error: 'User with this Login ID already exists' });
    }

    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'This email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = uuid();

    db.prepare('INSERT INTO users (id, login_id, email, password_hash, name) VALUES (?, ?, ?, ?, ?)').run(
      userId, loginId, email, passwordHash, name || loginId
    );

    return res.status(201).json({ message: 'User created successfully' });
  } catch (err: any) {
    console.error('Signup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({ error: 'Login ID and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE login_id = ?').get(loginId) as any;
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.login_id);

    return res.json({
      token,
      user: {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Forgot Password – generate OTP
router.post('/forgot-password', (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      // Don't reveal whether user exists
      return res.json({ message: 'If this email exists, a reset code has been sent' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Store expiry as SQLite-compatible datetime string (no T, no Z)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', ''); // 10 min

    // Invalidate old OTPs
    db.prepare('UPDATE otp_codes SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

    // Store new OTP
    db.prepare('INSERT INTO otp_codes (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)').run(
      uuid(), user.id, otp, expiresAt
    );

    // Log OTP to console for dev (in production, send via email)
    console.log(`\n📧 OTP for ${email}: ${otp} (expires in 10 minutes)\n`);

    // Attempt email send (won't crash if SMTP not configured)
    try {
      if (process.env.SMTP_HOST) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        transporter.sendMail({
          from: `"Sanchay" <${process.env.SMTP_FROM || 'noreply@stockflow.com'}>`,
          to: email,
          subject: 'Sanchay – Password Reset OTP',
          text: `Your OTP code is: ${otp}. It expires in 10 minutes.`,
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #fff; border-radius: 16px; border: 1px solid #f0f0f0;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #F97316; margin: 0; font-size: 28px;">Sanchay</h1>
                <p style="color: #888; font-size: 13px; margin: 4px 0 0;">Inventory Management System</p>
              </div>
              <h2 style="color: #333; text-align: center; margin-bottom: 8px;">Password Reset</h2>
              <p style="color: #666; text-align: center; font-size: 14px;">Use the following OTP to reset your password:</p>
              <div style="background: linear-gradient(135deg, #FFF7ED, #FFEDD5); border: 2px solid #F97316; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #EA580C;">${otp}</span>
              </div>
              <p style="color: #888; text-align: center; font-size: 12px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
              <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;" />
              <p style="color: #aaa; text-align: center; font-size: 11px;">© Sanchay Inventory Management</p>
            </div>
          `
        }).catch((e: any) => console.log('Email send failed:', e.message));
      }
    } catch (e) {
      // SMTP not configured, already logged to console
    }

    return res.json({ message: 'If this email exists, a reset code has been sent' });
  } catch (err: any) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
router.post('/verify-otp', (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or OTP' });
    }

    // Use strftime to compare in a format-safe way
    const nowUtc = new Date().toISOString().replace('T', ' ').replace('Z', '');
    const otpRecord = db.prepare(
      'SELECT * FROM otp_codes WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1'
    ).get(user.id, otp, nowUtc) as any;

    if (!otpRecord) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').run(otpRecord.id);

    // Generate a short-lived token for password reset
    const resetToken = generateToken(user.id, 'reset');

    return res.json({ message: 'OTP verified', resetToken });
  } catch (err: any) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, getJwtSecret());
    } catch (e: any) {
      console.error('JWT Verify Error:', e.name, e.message, 'Token:', resetToken.substring(0, 20) + '...');
      return res.status(400).json({ error: `Invalid or expired reset token: ${e.message}` });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, decoded.userId);

    return res.json({ message: 'Password reset successfully' });
  } catch (err: any) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
