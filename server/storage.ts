import { 
  users, 
  User, 
  InsertUser, 
  assignmentHistory, 
  AssignmentHistory, 
  InsertAssignmentHistory,
  subscriptionPayments,
  SubscriptionPayment,
  InsertSubscriptionPayment
} from "@shared/schema";
import * as bcrypt from 'bcrypt';

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // Assignment history operations
  getAssignmentHistory(userId: number): Promise<AssignmentHistory[]>;
  getAssignment(id: number): Promise<AssignmentHistory | undefined>;
  createAssignment(assignment: InsertAssignmentHistory): Promise<AssignmentHistory>;
  updateAssignment(id: number, updates: Partial<AssignmentHistory>): Promise<AssignmentHistory | undefined>;
  
  // Subscription payment operations
  createPayment(payment: InsertSubscriptionPayment): Promise<SubscriptionPayment>;
  getPaymentByOrderId(orderId: string): Promise<SubscriptionPayment | undefined>;
  updatePayment(id: number, updates: Partial<SubscriptionPayment>): Promise<SubscriptionPayment | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private usersData: Map<number, User>;
  private assignmentsData: Map<number, AssignmentHistory>;
  private paymentsData: Map<number, SubscriptionPayment>;
  private currentUserId: number;
  private currentAssignmentId: number;
  private currentPaymentId: number;

  constructor() {
    this.usersData = new Map();
    this.assignmentsData = new Map();
    this.paymentsData = new Map();
    this.currentUserId = 1;
    this.currentAssignmentId = 1;
    this.currentPaymentId = 1;
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    return this.usersData.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.usersData.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const user: User = { 
      ...insertUser, 
      id,
      password: hashedPassword,
      freeAttempts: 3,
      subscriptionStatus: "free"
    };
    
    this.usersData.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.usersData.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.usersData.set(id, updatedUser);
    return updatedUser;
  }

  // Assignment history related methods
  async getAssignmentHistory(userId: number): Promise<AssignmentHistory[]> {
    return Array.from(this.assignmentsData.values())
      .filter(assignment => assignment.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getAssignment(id: number): Promise<AssignmentHistory | undefined> {
    return this.assignmentsData.get(id);
  }

  async createAssignment(assignment: InsertAssignmentHistory): Promise<AssignmentHistory> {
    const id = this.currentAssignmentId++;
    const now = new Date();
    
    const newAssignment: AssignmentHistory = {
      ...assignment,
      id,
      timestamp: now,
    };
    
    this.assignmentsData.set(id, newAssignment);
    return newAssignment;
  }

  async updateAssignment(id: number, updates: Partial<AssignmentHistory>): Promise<AssignmentHistory | undefined> {
    const assignment = this.assignmentsData.get(id);
    if (!assignment) return undefined;
    
    const updatedAssignment = { ...assignment, ...updates };
    this.assignmentsData.set(id, updatedAssignment);
    return updatedAssignment;
  }

  // Payment related methods
  async createPayment(payment: InsertSubscriptionPayment): Promise<SubscriptionPayment> {
    const id = this.currentPaymentId++;
    const now = new Date();
    
    const newPayment: SubscriptionPayment = {
      ...payment,
      id,
      timestamp: now,
    };
    
    this.paymentsData.set(id, newPayment);
    return newPayment;
  }

  async getPaymentByOrderId(orderId: string): Promise<SubscriptionPayment | undefined> {
    return Array.from(this.paymentsData.values()).find(
      payment => payment.orderId === orderId
    );
  }

  async updatePayment(id: number, updates: Partial<SubscriptionPayment>): Promise<SubscriptionPayment | undefined> {
    const payment = this.paymentsData.get(id);
    if (!payment) return undefined;
    
    const updatedPayment = { ...payment, ...updates };
    this.paymentsData.set(id, updatedPayment);
    return updatedPayment;
  }
}

// Export an instance of MemStorage
export const storage = new MemStorage();
