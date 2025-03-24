import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import * as bcrypt from 'bcrypt';
import session from 'express-session';
import MemoryStore from 'memorystore';
import multer from 'multer';
import { z } from 'zod';
import { loginSchema, registrationSchema } from "@shared/schema";
import { fileProcessor } from "./services/fileProcessor";
import { aiService } from "./services/aiService";
import { pdfGenerator } from "./services/pdfGenerator";
import { paymentService } from "./services/payment";

// Setup multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  const MemorySessionStore = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || 'dev-secret-solvem8',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 86400000 }, // 24 hours
      store: new MemorySessionStore({
        checkPeriod: 86400000, // Clear expired sessions every 24h
      }),
    })
  );

  // Authentication Middleware
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    next();
  };

  // User Authentication Routes
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const validatedData = registrationSchema.parse(req.body);
      
      // Check if user with email already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ message: 'Email already in use' });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(409).json({ message: 'Username already taken' });
      }
      
      // Create new user
      const user = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: validatedData.password,
        freeAttempts: 3,
        subscriptionStatus: 'free'
      });
      
      return res.status(201).json({ 
        message: 'User created successfully',
        userId: user.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Signup error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Compare passwords
      const passwordMatch = await bcrypt.compare(validatedData.password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      
      // Set user session
      req.session.userId = user.id;
      
      return res.status(200).json({ 
        message: 'Login successful',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          freeAttempts: user.freeAttempts,
          subscriptionStatus: user.subscriptionStatus
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error('Login error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: 'Failed to logout' });
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({ message: 'Logged out successfully' });
    });
  });

  // Current User Info
  app.get('/api/user', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      return res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
        freeAttempts: user.freeAttempts,
        subscriptionStatus: user.subscriptionStatus
      });
    } catch (error) {
      console.error('Get user error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // File Upload Endpoint
  app.post('/api/upload', authenticate, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      const userId = req.session.userId as number;
      const file = req.file;
      
      // Process the uploaded file
      const { fileUrl, extractedText } = await fileProcessor.processFile(file);
      
      return res.status(200).json({ 
        message: 'File uploaded successfully',
        fileUrl,
        extractedText,
        fileName: file.originalname
      });
    } catch (error) {
      console.error('File upload error:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to process file'
      });
    }
  });

  // Assignment Processing Endpoint
  app.post('/api/process', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { text, fileUrl } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: 'No text provided for processing' });
      }
      
      // Get user and check remaining attempts
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Only decrement free attempts if subscription is not active
      if (user.subscriptionStatus === 'free' && user.freeAttempts <= 0) {
        return res.status(403).json({ message: 'No free attempts remaining' });
      }
      
      // Process the assignment with AI
      const solution = await aiService.processAssignment(text);
      
      // Create or update assignment history entry
      const fileName = fileUrl ? fileUrl.split('/').pop() : 'Text Input';
      const assignment = await storage.createAssignment({
        userId,
        fileName,
        fileUrl: fileUrl || '',
        extractedText: text,
        solution,
        attemptCount: 1
      });
      
      // Decrement free attempts if subscription is not active
      if (user.subscriptionStatus === 'free') {
        await storage.updateUser(userId, { 
          freeAttempts: Math.max(0, user.freeAttempts - 1) 
        });
      }
      
      return res.status(200).json({
        message: 'Assignment processed successfully',
        solution,
        assignmentId: assignment.id
      });
    } catch (error) {
      console.error('Assignment processing error:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to process assignment'
      });
    }
  });

  // PDF Generation Endpoint
  app.post('/api/generate-pdf', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { solution, question, fileUrl } = req.body;
      
      if (!solution) {
        return res.status(400).json({ message: 'No solution provided' });
      }
      
      // Generate PDF from solution
      const pdfUrl = await pdfGenerator.generatePDF({
        userId,
        question,
        solution,
        fileUrl
      });
      
      return res.status(200).json({
        message: 'PDF generated successfully',
        pdfUrl
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to generate PDF'
      });
    }
  });

  // Get Assignment History
  app.get('/api/assignments', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const assignments = await storage.getAssignmentHistory(userId);
      
      return res.status(200).json(assignments);
    } catch (error) {
      console.error('Get assignments error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Payment Routes
  app.post('/api/payment/initiate', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { plan } = req.body;
      
      if (!plan || !['monthly', 'pack'].includes(plan)) {
        return res.status(400).json({ message: 'Invalid plan type' });
      }
      
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Determine amount based on plan
      const amount = plan === 'monthly' ? 19900 : 29900; // in paise (₹199 or ₹299)
      
      // Create order with Razorpay
      const order = await paymentService.createOrder(amount);
      
      // Store payment details
      await storage.createPayment({
        userId,
        amount,
        orderId: order.id,
        status: 'pending',
        planType: plan
      });
      
      return res.status(200).json({
        message: 'Payment initiated',
        order_id: order.id,
        amount
      });
    } catch (error) {
      console.error('Payment initiation error:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to initiate payment'
      });
    }
  });

  app.post('/api/payment/verify', authenticate, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId as number;
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
      
      // Verify payment with Razorpay
      const isValid = paymentService.verifyPayment(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      );
      
      if (!isValid) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
      
      // Get payment record
      const payment = await storage.getPaymentByOrderId(razorpay_order_id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment record not found' });
      }
      
      // Update payment status
      await storage.updatePayment(payment.id, {
        status: 'completed',
        paymentId: razorpay_payment_id
      });
      
      // Update user subscription or attempts based on plan
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (payment.planType === 'monthly') {
        // Set subscription to active for 30 days
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        await storage.updateUser(userId, {
          subscriptionStatus: 'active',
          subscriptionExpiresAt: expiryDate
        });
      } else if (payment.planType === 'pack') {
        // Add 20 attempts to the user's account
        await storage.updateUser(userId, {
          freeAttempts: user.freeAttempts + 20
        });
      }
      
      return res.status(200).json({
        message: 'Payment verified successfully',
        status: 'completed'
      });
    } catch (error) {
      console.error('Payment verification error:', error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to verify payment'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
