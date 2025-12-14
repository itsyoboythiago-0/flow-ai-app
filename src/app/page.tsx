"use client";

import { useState, useEffect } from "react";
import { Plus, Check, Trash2, Edit2, Calendar, Target, Bell, User, Settings as SettingsIcon, Home as HomeIcon, CheckCircle2, Sparkles, BarChart3, ChevronRight, Send, Zap, Brain, Award, Flame, Clock, TrendingUp, Star, Sunrise, Moon, Dumbbell, Book, Coffee, AlertCircle, Repeat, ChevronLeft, Grid3x3, List } from "lucide-react";
import Onboarding from "@/components/Onboarding";
import { supabase } from "@/lib/supabase";

type Habit = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  category?: "morning" | "evening" | "health" | "work" | "personal";
};

type Task = {
  id: string;
  title: string;
  date: Date;
  time?: string;
  completed: boolean;
  reminder?: boolean;
  category?: "work" | "personal" | "family" | "health";
  priority?: "high" | "medium" | "low";
};

type Tab = "home" | "habits" | "tasks" | "ai-coach" | "progress" | "settings";

type ChatMessage = {
  id: string;
  text: string;
  sender: "ai" | "user";
  timestamp: Date;
  action?: {
    type: "task" | "habit";
    data: any;
    status: "pending" | "confirmed";
  };
};

type ViewMode = "day" | "week" | "month";

type OnboardingData = {
  identity: string;
  goal: string;
  goalOther?: string;
  focusAreas: string[];
  coachTone: "strict" | "balanced" | "encouraging";
  reminderTime: string;
  fallBehindReminder: boolean;
};

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const HABIT_SUGGESTIONS = [
  { title: "Morning Meditation", category: "morning" as const, icon: Sunrise },
  { title: "Drink Water", category: "health" as const, icon: Coffee },
  { title: "Exercise 30min", category: "health" as const, icon: Dumbbell },
  { title: "Read 20 Pages", category: "personal" as const, icon: Book },
  { title: "Evening Journal", category: "evening" as const, icon: Moon },
  { title: "Deep Work Session", category: "work" as const, icon: Target },
];

const CATEGORY_COLORS = {
  morning: { bg: "from-orange-50 to-yellow-50", border: "border-orange-200", text: "text-orange-700", icon: "text-orange-500" },
  evening: { bg: "from-indigo-50 to-purple-50", border: "border-indigo-200", text: "text-indigo-700", icon: "text-indigo-500" },
  health: { bg: "from-green-50 to-emerald-50", border: "border-green-200", text: "text-green-700", icon: "text-green-500" },
  work: { bg: "from-blue-50 to-cyan-50", border: "border-blue-200", text: "text-blue-700", icon: "text-blue-500" },
  personal: { bg: "from-pink-50 to-rose-50", border: "border-pink-200", text: "text-pink-700", icon: "text-pink-500" },
};

const TASK_CATEGORY_COLORS = {
  work: { bg: "bg-blue-100", text: "text-blue-700" },
  personal: { bg: "bg-purple-100", text: "text-purple-700" },
  family: { bg: "bg-pink-100", text: "text-pink-700" },
  health: { bg: "bg-green-100", text: "text-green-700" },
};

// Calendar utility functions
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getMonthCalendar(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const calendar: (Date | null)[][] = [];
  let week: (Date | null)[] = [];
  
  // Fill in empty days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    week.push(null);
  }
  
  // Fill in days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(new Date(year, month, day));
    
    if (week.length === 7) {
      calendar.push(week);
      week = [];
    }
  }
  
  // Fill in remaining days to complete the last week
  if (week.length > 0) {
    while (week.length < 7) {
      week.push(null);
    }
    calendar.push(week);
  }
  
  return calendar;
}

function getWeekDates(date: Date): Date[] {
  const dates: Date[] = [];
  const day = date.getDay();
  const diff = date.getDate() - day;
  
  for (let i = 0; i < 7; i++) {
    const weekDate = new Date(date);
    weekDate.setDate(diff + i);
    dates.push(weekDate);
  }
  
  return dates;
}

export default function FlowAI() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showResetProgressConfirm, setShowResetProgressConfirm] = useState(false);
  
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [habits, setHabits] = useState<Habit[]>([
    { id: "1", title: "Morning Routine", completed: false, createdAt: new Date(), category: "morning" },
    { id: "2", title: "Workout", completed: false, createdAt: new Date(), category: "health" },
    { id: "3", title: "Read 30 Minutes", completed: false, createdAt: new Date(), category: "personal" },
  ]);
  const [editingHabit, setEditingHabit] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newHabitTitle, setNewHabitTitle] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState<Habit["category"]>("personal");
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [streak, setStreak] = useState(3);
  
  // Tasks state with real dates
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">("AM");
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const [tasks, setTasks] = useState<Task[]>([
    { id: "1", title: "Doctor appointment", date: today, time: "10:00 AM", completed: false, reminder: true, category: "health", priority: "high" },
    { id: "2", title: "Take kids to school", date: today, time: "8:00 AM", completed: false, category: "family" },
    { id: "3", title: "Workout", date: today, completed: false, category: "health" },
    { id: "4", title: "Team meeting", date: tomorrow, time: "2:00 PM", completed: false, reminder: true, category: "work", priority: "high" },
  ]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newTaskReminder, setNewTaskReminder] = useState(false);
  const [newTaskCategory, setNewTaskCategory] = useState<Task["category"]>("personal");
  const [newTaskPriority, setNewTaskPriority] = useState<Task["priority"]>("medium");
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      text: "I'm here to help you stay consistent. Tell me what today looks like.",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  // Settings state
  const [coachingTone, setCoachingTone] = useState<"strict" | "balanced" | "encouraging">("balanced");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultView, setDefaultView] = useState<"day" | "week">("day");

  // Check onboarding status on mount
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // No user logged in - for demo purposes, create a mock user ID
        const mockUserId = localStorage.getItem('flow_ai_mock_user_id') || `mock_${Date.now()}`;
        localStorage.setItem('flow_ai_mock_user_id', mockUserId);
        setUserId(mockUserId);
        
        // Check if onboarding was completed for this mock user
        const onboardingComplete = localStorage.getItem(`onboarding_complete_${mockUserId}`) === 'true';
        setShowOnboarding(!onboardingComplete);
        setIsLoadingOnboarding(false);
        return;
      }

      setUserId(user.id);

      // Check if user has completed onboarding
      const { data, error } = await supabase
        .from('user_profiles')
        .select('onboarding_complete')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking onboarding:', error);
      }

      setShowOnboarding(!data?.onboarding_complete);
    } catch (error) {
      console.error('Error in checkOnboardingStatus:', error);
    } finally {
      setIsLoadingOnboarding(false);
    }
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      if (!userId) return;

      // Prepare data for Supabase
      const profileData = {
        user_id: userId,
        onboarding_complete: true,
        identity: data.identity,
        goal: data.goal === 'other' ? data.goalOther : data.goal,
        focus_areas: data.focusAreas,
        coach_tone: data.coachTone,
        reminder_time: data.reminderTime,
        start_date: new Date().toISOString().split('T')[0],
      };

      // Check if this is a mock user (no real auth)
      if (userId.startsWith('mock_')) {
        // Save to localStorage for demo
        localStorage.setItem(`onboarding_complete_${userId}`, 'true');
        localStorage.setItem(`onboarding_data_${userId}`, JSON.stringify(profileData));
        setCoachingTone(data.coachTone);
        setShowOnboarding(false);
        return;
      }

      // Save to Supabase
      const { error } = await supabase
        .from('user_profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving onboarding:', error);
        alert('Failed to save onboarding data. Please try again.');
        return;
      }

      // Update local state
      setCoachingTone(data.coachTone);
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error in handleOnboardingComplete:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleResetOnboarding = async () => {
    try {
      if (!userId) return;

      // Check if this is a mock user
      if (userId.startsWith('mock_')) {
        localStorage.removeItem(`onboarding_complete_${userId}`);
        localStorage.removeItem(`onboarding_data_${userId}`);
        setShowOnboarding(true);
        setShowResetConfirm(false);
        return;
      }

      // Reset in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_complete: false,
          identity: null,
          goal: null,
          focus_areas: [],
          coach_tone: 'balanced',
          reminder_time: null,
        })
        .eq('user_id', userId);

      if (error) {
        console.error('Error resetting onboarding:', error);
        alert('Failed to reset onboarding. Please try again.');
        return;
      }

      setShowOnboarding(true);
      setShowResetConfirm(false);
    } catch (error) {
      console.error('Error in handleResetOnboarding:', error);
      alert('An error occurred. Please try again.');
    }
  };

  const handleResetProgress = async () => {
    try {
      if (!userId) return;

      // Check if this is a mock user
      if (userId.startsWith('mock_')) {
        // Reset local state
        setHabits([]);
        setTasks([]);
        setStreak(0);
        setShowResetProgressConfirm(false);
        alert('Progress reset successfully!');
        return;
      }

      // Delete all user data from Supabase
      const { error: tasksError } = await supabase
        .from('tasks')
        .update({ completed: false })
        .eq('user_id', userId);

      const { error: habitsError } = await supabase
        .from('habits')
        .update({ completed: false, streak: 0 })
        .eq('user_id', userId);

      const { error: progressError } = await supabase
        .from('progress')
        .update({ 
          habits_completed: 0, 
          tasks_completed: 0, 
          completion_rate: 0 
        })
        .eq('user_id', userId);

      if (tasksError || habitsError || progressError) {
        console.error('Error resetting progress:', { tasksError, habitsError, progressError });
        alert('Failed to reset progress. Please try again.');
        return;
      }

      // Reset local state
      setHabits(habits.map(h => ({ ...h, completed: false })));
      setTasks(tasks.map(t => ({ ...t, completed: false })));
      setStreak(0);
      setShowResetProgressConfirm(false);
      alert('Progress reset successfully!');
    } catch (error) {
      console.error('Error in handleResetProgress:', error);
      alert('An error occurred. Please try again.');
    }
  };

  // Calculate progress
  const progressPercentage = habits.length > 0 ? Math.round((habits.filter(h => h.completed).length / habits.length) * 100) : 0;
  const completedCount = habits.filter(h => h.completed).length;
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const getHabitInsight = () => {
    if (habits.length === 0) {
      return "Start building your routine. Add your first habit to begin your journey.";
    } else if (completedCount === habits.length && habits.length > 0) {
      return "Perfect execution today. You're building unstoppable momentum.";
    } else if (completedCount === 0) {
      return "Every journey starts with a single step. Begin with your easiest habit.";
    } else if (progressPercentage >= 50) {
      return "Strong progress. Complete the remaining habits to finish strong.";
    } else {
      return "You've started well. Keep the momentum going with your next habit.";
    }
  };

  const toggleHabit = (id: string) => {
    setHabits(habits.map(h => 
      h.id === id ? { ...h, completed: !h.completed } : h
    ));
  };

  const addHabit = () => {
    if (newHabitTitle.trim()) {
      const newHabit: Habit = {
        id: Date.now().toString(),
        title: newHabitTitle.trim(),
        completed: false,
        createdAt: new Date(),
        category: newHabitCategory,
      };
      setHabits([...habits, newHabit]);
      setNewHabitTitle("");
      setNewHabitCategory("personal");
      setShowAddHabit(false);
    }
  };

  const addSuggestedHabit = (title: string, category: Habit["category"]) => {
    const newHabit: Habit = {
      id: Date.now().toString(),
      title,
      completed: false,
      createdAt: new Date(),
      category,
    };
    setHabits([...habits, newHabit]);
  };

  const deleteHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
  };

  const startEdit = (id: string, currentTitle: string) => {
    setEditingHabit(id);
    setEditValue(currentTitle);
  };

  const saveEdit = (id: string) => {
    if (editValue.trim()) {
      setHabits(habits.map(h => 
        h.id === id ? { ...h, title: editValue.trim() } : h
      ));
    }
    setEditingHabit(null);
    setEditValue("");
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    ));
  };

  const addTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        date: new Date(currentDate),
        time: newTaskTime || undefined,
        completed: false,
        reminder: newTaskReminder,
        category: newTaskCategory,
        priority: newTaskPriority,
      };
      setTasks([...tasks, newTask]);
      setNewTaskTitle("");
      setNewTaskTime("");
      setNewTaskReminder(false);
      setNewTaskCategory("personal");
      setNewTaskPriority("medium");
      setShowAddTask(false);
      setShowTimePicker(false);
    }
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const selectTimeFromPicker = () => {
    const hour12 = selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour;
    const timeString = `${hour12}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
    setNewTaskTime(timeString);
    setShowTimePicker(false);
  };

  const parseAICommand = (input: string): { type: "task" | "habit" | null; data: any } => {
    const lower = input.toLowerCase();
    
    if (lower.includes("add task") || lower.includes("add a task") || lower.includes("remind me")) {
      const timeMatch = input.match(/(\d{1,2}:\d{2}\s?(?:am|pm)?|\d{1,2}\s?(?:am|pm))/i);
      const titleMatch = input.match(/(?:add task|add a task|remind me)(?:\s+\w+)?(?:\s+at\s+[\d:apm\s]+)?:?\s*(.+?)(?:\s+(?:on|at|for)\s+|$)/i);
      
      return {
        type: "task",
        data: {
          title: titleMatch ? titleMatch[1].trim() : input,
          date: currentDate,
          time: timeMatch ? timeMatch[0] : undefined,
          reminder: lower.includes("remind"),
        }
      };
    }
    
    if (lower.includes("habit") || lower.includes("make") && lower.includes("routine")) {
      const titleMatch = input.match(/(?:make|add|create)\s+(.+?)\s+(?:a\s+)?habit/i);
      
      return {
        type: "habit",
        data: {
          title: titleMatch ? titleMatch[1].trim() : input,
        }
      };
    }
    
    return { type: null, data: null };
  };

  const sendMessage = () => {
    if (chatInput.trim()) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        text: chatInput.trim(),
        sender: "user",
        timestamp: new Date(),
      };
      
      setChatMessages([...chatMessages, userMessage]);
      const userInput = chatInput.trim();
      setChatInput("");
      
      const parsed = parseAICommand(userInput);
      
      setTimeout(() => {
        if (parsed.type === "task") {
          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: `I'll add this task for you:`,
            sender: "ai",
            timestamp: new Date(),
            action: {
              type: "task",
              data: parsed.data,
              status: "pending",
            }
          };
          setChatMessages(prev => [...prev, aiResponse]);
        } else if (parsed.type === "habit") {
          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: `I'll create this habit for you:`,
            sender: "ai",
            timestamp: new Date(),
            action: {
              type: "habit",
              data: parsed.data,
              status: "pending",
            }
          };
          setChatMessages(prev => [...prev, aiResponse]);
        } else {
          const aiResponse: ChatMessage = {
            id: (Date.now() + 1).toString(),
            text: getAIResponse(userInput),
            sender: "ai",
            timestamp: new Date(),
          };
          setChatMessages(prev => [...prev, aiResponse]);
        }
      }, 1000);
    }
  };

  const confirmAction = (messageId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    if (!message?.action) return;

    if (message.action.type === "task") {
      const newTask: Task = {
        id: Date.now().toString(),
        title: message.action.data.title,
        date: message.action.data.date,
        time: message.action.data.time,
        completed: false,
        reminder: message.action.data.reminder,
      };
      setTasks([...tasks, newTask]);
      
      setChatMessages(chatMessages.map(m => 
        m.id === messageId 
          ? { ...m, action: { ...m.action!, status: "confirmed" } }
          : m
      ));
      
      setTimeout(() => {
        const successMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          text: `✅ Task added successfully! You can find it in your Tasks.`,
          sender: "ai",
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, successMessage]);
      }, 500);
    } else if (message.action.type === "habit") {
      const newHabit: Habit = {
        id: Date.now().toString(),
        title: message.action.data.title,
        completed: false,
        createdAt: new Date(),
      };
      setHabits([...habits, newHabit]);
      
      setChatMessages(chatMessages.map(m => 
        m.id === messageId 
          ? { ...m, action: { ...m.action!, status: "confirmed" } }
          : m
      ));
      
      setTimeout(() => {
        const successMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          text: `✅ Habit created successfully! You can track it in your Habits tab.`,
          sender: "ai",
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, successMessage]);
      }, 500);
    }
  };

  const cancelAction = (messageId: string) => {
    setChatMessages(chatMessages.filter(m => m.id !== messageId));
    
    setTimeout(() => {
      const cancelMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        text: "No problem. Let me know if you'd like to try something else.",
        sender: "ai",
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, cancelMessage]);
    }, 500);
  };

  const quickReply = (message: string) => {
    setChatInput(message);
  };

  const getAIResponse = (input: string) => {
    const lower = input.toLowerCase();
    if (lower.includes("help") || lower.includes("stuck")) {
      return "Focus on one habit at a time. Start with the easiest one to build momentum. Small wins compound into lasting change.";
    } else if (lower.includes("motivat") || lower.includes("inspire")) {
      return "Discipline is choosing what you want most over what you want now. You're building something meaningful here.";
    } else if (lower.includes("progress") || lower.includes("doing")) {
      return `You've completed ${completedCount} out of ${habits.length} habits today. ${progressPercentage >= 50 ? "Strong work. Keep going." : "Every step counts. Stay consistent."}`;
    } else if (lower.includes("plan") || lower.includes("day")) {
      return "Let's plan your day. Tell me what tasks you need to complete, and I'll help you organize them. For example: 'Add task Monday at 3 PM: take kids to school'";
    } else if (lower.includes("streak") || lower.includes("consistent")) {
      return "Consistency beats intensity. Show up every day, even when it's hard. That's where real growth happens.";
    } else {
      return "I'm here to support you. I can help you add tasks, create habits, or plan your day. Try saying things like 'Add a task' or 'Make workout a habit'. What would you like to do?";
    }
  };

  const weeklyData = [65, 80, 45, 90, 70, 85, progressPercentage];
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const monthlyHeatmap = Array.from({ length: 35 }, (_, i) => ({
    day: i + 1,
    value: Math.floor(Math.random() * 100),
  }));

  const tasksForDay = tasks.filter(t => isSameDay(t.date, currentDate));
  const completedTasksForDay = tasksForDay.filter(t => t.completed);
  const incompleteTasksForDay = tasksForDay.filter(t => !t.completed);

  const morningTasks = incompleteTasksForDay.filter(t => {
    if (!t.time) return false;
    const hour = parseInt(t.time.split(':')[0]);
    const isPM = t.time.toLowerCase().includes('pm');
    const hour24 = isPM && hour !== 12 ? hour + 12 : hour;
    return hour24 < 12;
  });

  const afternoonTasks = incompleteTasksForDay.filter(t => {
    if (!t.time) return false;
    const hour = parseInt(t.time.split(':')[0]);
    const isPM = t.time.toLowerCase().includes('pm');
    const hour24 = isPM && hour !== 12 ? hour + 12 : hour;
    return hour24 >= 12 && hour24 < 17;
  });

  const eveningTasks = incompleteTasksForDay.filter(t => {
    if (!t.time) return false;
    const hour = parseInt(t.time.split(':')[0]);
    const isPM = t.time.toLowerCase().includes('pm');
    const hour24 = isPM && hour !== 12 ? hour + 12 : hour;
    return hour24 >= 17;
  });

  const noTimeTasks = incompleteTasksForDay.filter(t => !t.time);

  const incompleteHabits = habits.filter(h => !h.completed);
  const completedHabits = habits.filter(h => h.completed);

  const dayName = DAYS_FULL[currentDate.getDay()];
  const monthName = MONTHS[currentDate.getMonth()];
  const dayNumber = currentDate.getDate();
  const year = currentDate.getFullYear();
  const weekNumber = getWeekNumber(currentDate);

  const weekDates = getWeekDates(currentDate);
  const monthCalendar = getMonthCalendar(currentDate.getFullYear(), currentDate.getMonth());

  const todayTasks = tasks.filter(t => isSameDay(t.date, new Date())).slice(0, 3);

  // Show loading state while checking onboarding
  if (isLoadingOnboarding) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding if not completed
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Top Header Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-gray-100 z-50">
        <div className="max-w-md mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-black">Flow AI</span>
          </div>
          {activeTab === "home" && <Target className="w-6 h-6 text-black" />}
          {activeTab === "habits" && <CheckCircle2 className="w-6 h-6 text-black" />}
          {activeTab === "tasks" && <Calendar className="w-6 h-6 text-black" />}
          {activeTab === "ai-coach" && <Brain className="w-6 h-6 text-black" />}
          {activeTab === "progress" && <TrendingUp className="w-6 h-6 text-black" />}
          {activeTab === "settings" && <SettingsIcon className="w-6 h-6 text-black" />}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto pt-20">
        {/* Home Tab */}
        {activeTab === "home" && (
          <div className="px-6 pb-8 space-y-5 animate-fadeIn">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold text-black">Today's Focus</h1>
              <p className="text-lg text-gray-500">Here's how you're doing</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 shadow-lg border border-gray-200">
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48 mb-6">
                  <svg className="transform -rotate-90 w-48 h-48">
                    <circle cx="96" cy="96" r="88" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                    <circle
                      cx="96" cy="96" r="88" stroke="#000000" strokeWidth="12" fill="none"
                      strokeDasharray={`${2 * Math.PI * 88}`}
                      strokeDashoffset={`${2 * Math.PI * 88 * (1 - progressPercentage / 100)}`}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold text-black">{progressPercentage}%</span>
                    <span className="text-sm text-gray-500 mt-2">Daily Completion</span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {progressPercentage === 0 ? "Complete your first task to begin" : "Keep up the great work!"}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">What you're doing well</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      You're maintaining consistency with your habits
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-orange-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Needs attention today</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Focus on completing tasks earlier in the day
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Suggested focus</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {incompleteHabits[0]?.title || "Complete all your habits"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-black">Today's Tasks</h2>
                <button 
                  onClick={() => setActiveTab("tasks")}
                  className="text-sm font-semibold text-black hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {todayTasks.length > 0 ? (
                  todayTasks.map((task) => (
                    <div key={task.id} className="flex-shrink-0 w-64 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleTask(task.id)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                            task.completed ? "bg-black border-black" : "border-gray-300 bg-white"
                          }`}
                        >
                          {task.completed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium mb-1 ${task.completed ? "text-gray-400 line-through" : "text-black"}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2">
                            {task.time && (
                              <span className="text-xs text-gray-500">{task.time}</span>
                            )}
                            {task.priority === "high" && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                High
                              </span>
                            )}
                            {task.category && (
                              <span className={`px-2 py-0.5 ${TASK_CATEGORY_COLORS[task.category].bg} ${TASK_CATEGORY_COLORS[task.category].text} text-xs font-semibold rounded-full capitalize`}>
                                {task.category}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="w-full bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
                    <p className="text-sm text-gray-500">No tasks for today</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl font-bold text-black">Habit Snapshot</h2>
              <div className="space-y-3">
                {habits.slice(0, 3).map((habit) => (
                  <div key={habit.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-black">{habit.title}</span>
                      <span className="text-xs text-gray-500">{habit.completed ? "100%" : "0%"}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-black rounded-full transition-all duration-700"
                        style={{ width: habit.completed ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-center text-gray-500 px-4">
                Habits evolve as you stay consistent
              </p>
            </div>

            <div className="bg-gradient-to-br from-black to-gray-800 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-white" />
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wide">AI Coach</span>
              </div>
              <p className="text-white text-base leading-relaxed mb-5">
                You're early in the process. Momentum starts with one action.
              </p>
              <button 
                onClick={() => setActiveTab("ai-coach")}
                className="w-full bg-white text-black rounded-full py-3 font-semibold hover:bg-gray-100 transition-all duration-200 active:scale-[0.98]"
              >
                Open AI Coach
              </button>
            </div>
          </div>
        )}

        {/* Habits Tab */}
        {activeTab === "habits" && (
          <div className="px-6 pb-8 space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold text-black tracking-tight">Habits</h1>
              <p className="text-lg text-gray-500">Build lasting routines</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Current Streak</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-black">{streak}</span>
                    <span className="text-xl text-gray-500 font-medium">days</span>
                  </div>
                </div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                  <Flame className="w-10 h-10 text-white" />
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {getHabitInsight()}
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-black">Today</h2>
                <span className="text-sm font-semibold text-gray-500">
                  {completedCount} / {habits.length}
                </span>
              </div>

              {incompleteHabits.length > 0 && (
                <div className="space-y-3">
                  {incompleteHabits.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      onToggle={toggleHabit}
                      onDelete={deleteHabit}
                      onEdit={startEdit}
                      isEditing={editingHabit === habit.id}
                      editValue={editValue}
                      setEditValue={setEditValue}
                      onSaveEdit={saveEdit}
                    />
                  ))}
                </div>
              )}

              {completedHabits.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-lg font-bold text-gray-400">Completed</h3>
                  {completedHabits.map((habit) => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      onToggle={toggleHabit}
                      onDelete={deleteHabit}
                      onEdit={startEdit}
                      isEditing={editingHabit === habit.id}
                      editValue={editValue}
                      setEditValue={setEditValue}
                      onSaveEdit={saveEdit}
                    />
                  ))}
                </div>
              )}

              {habits.length === 0 && (
                <div className="bg-gray-50 rounded-3xl p-12 text-center border border-gray-100">
                  <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-black mb-2">No habits yet</h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
                    Start building your routine by adding your first habit
                  </p>
                </div>
              )}
            </div>

            {!showAddHabit && (
              <button
                onClick={() => setShowAddHabit(true)}
                className="w-full bg-black text-white rounded-full py-4 px-6 font-semibold hover:bg-gray-900 transition-all duration-200 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Habit
              </button>
            )}

            {showAddHabit && (
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-lg animate-slideIn">
                <h3 className="text-xl font-bold text-black mb-4">Create New Habit</h3>
                <input
                  type="text"
                  value={newHabitTitle}
                  onChange={(e) => setNewHabitTitle(e.target.value)}
                  placeholder="Habit name..."
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-black mb-4"
                  autoFocus
                />
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["morning", "evening", "health", "work", "personal"] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setNewHabitCategory(cat)}
                        className={`px-4 py-3 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
                          newHabitCategory === cat
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addHabit}
                    className="flex-1 bg-black text-white rounded-full py-3 font-semibold hover:bg-gray-900 transition-all duration-200 active:scale-[0.98]"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddHabit(false);
                      setNewHabitTitle("");
                      setNewHabitCategory("personal");
                    }}
                    className="flex-1 bg-gray-100 text-black rounded-full py-3 font-semibold hover:bg-gray-200 transition-all duration-200 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-black">Suggested Habits</h2>
              <div className="grid grid-cols-2 gap-3">
                {HABIT_SUGGESTIONS.map((suggestion, index) => {
                  const Icon = suggestion.icon;
                  const colors = CATEGORY_COLORS[suggestion.category];
                  return (
                    <button
                      key={index}
                      onClick={() => addSuggestedHabit(suggestion.title, suggestion.category)}
                      className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-5 text-left hover:shadow-md transition-all duration-200 active:scale-[0.98]`}
                    >
                      <Icon className={`w-8 h-8 ${colors.icon} mb-3`} />
                      <p className={`text-sm font-semibold ${colors.text}`}>{suggestion.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === "tasks" && (
          <div className="px-6 pb-8 space-y-5 animate-fadeIn">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold text-black tracking-tight">Tasks</h1>
              <p className="text-lg text-gray-500">Plan your day</p>
            </div>

            <div className="bg-white rounded-3xl p-1 border border-gray-200 shadow-sm inline-flex">
              {(["day", "week", "month"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-6 py-2.5 rounded-full text-sm font-semibold capitalize transition-all duration-200 ${
                    viewMode === mode
                      ? "bg-black text-white"
                      : "text-gray-600 hover:text-black"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => navigateDate("prev")}
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5 text-black" />
                </button>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-black">
                    {viewMode === "day" && `${dayName}, ${monthName} ${dayNumber}`}
                    {viewMode === "week" && `Week ${weekNumber}, ${year}`}
                    {viewMode === "month" && `${monthName} ${year}`}
                  </h2>
                  {viewMode === "day" && (
                    <p className="text-sm text-gray-500 mt-1">
                      {completedTasksForDay.length} completed · {incompleteTasksForDay.length} remaining
                    </p>
                  )}
                </div>
                <button
                  onClick={() => navigateDate("next")}
                  className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all active:scale-95"
                >
                  <ChevronRight className="w-5 h-5 text-black" />
                </button>
              </div>

              {viewMode === "week" && (
                <div className="grid grid-cols-7 gap-2">
                  {weekDates.map((date, index) => {
                    const isToday = isSameDay(date, new Date());
                    const isSelected = isSameDay(date, currentDate);
                    const dayTasks = tasks.filter(t => isSameDay(t.date, date));
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentDate(date)}
                        className={`p-3 rounded-2xl text-center transition-all duration-200 ${
                          isSelected
                            ? "bg-black text-white"
                            : isToday
                            ? "bg-white border-2 border-black text-black"
                            : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <div className="text-xs font-semibold mb-1">{DAYS_SHORT[date.getDay()]}</div>
                        <div className="text-lg font-bold">{date.getDate()}</div>
                        {dayTasks.length > 0 && (
                          <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1 ${isSelected ? "bg-white" : "bg-black"}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {viewMode === "month" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-7 gap-2 mb-2">
                    {DAYS_SHORT.map((day) => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>
                  {monthCalendar.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-2">
                      {week.map((date, dayIndex) => {
                        if (!date) {
                          return <div key={dayIndex} className="aspect-square" />;
                        }
                        const isToday = isSameDay(date, new Date());
                        const isSelected = isSameDay(date, currentDate);
                        const dayTasks = tasks.filter(t => isSameDay(t.date, date));
                        return (
                          <button
                            key={dayIndex}
                            onClick={() => setCurrentDate(date)}
                            className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all duration-200 ${
                              isSelected
                                ? "bg-black text-white"
                                : isToday
                                ? "bg-white border-2 border-black text-black"
                                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                          >
                            {date.getDate()}
                            {dayTasks.length > 0 && (
                              <div className={`w-1 h-1 rounded-full mt-1 ${isSelected ? "bg-white" : "bg-black"}`} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {viewMode === "day" && (
              <div className="space-y-4">
                {morningTasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Sunrise className="w-5 h-5 text-orange-500" />
                      <h3 className="text-lg font-bold text-black">Morning</h3>
                    </div>
                    {morningTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                    ))}
                  </div>
                )}

                {afternoonTasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-5 h-5 text-blue-500" />
                      <h3 className="text-lg font-bold text-black">Afternoon</h3>
                    </div>
                    {afternoonTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                    ))}
                  </div>
                )}

                {eveningTasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Moon className="w-5 h-5 text-indigo-500" />
                      <h3 className="text-lg font-bold text-black">Evening</h3>
                    </div>
                    {eveningTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                    ))}
                  </div>
                )}

                {noTimeTasks.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-gray-500" />
                      <h3 className="text-lg font-bold text-black">Anytime</h3>
                    </div>
                    {noTimeTasks.map((task) => (
                      <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                    ))}
                  </div>
                )}

                {completedTasksForDay.length > 0 && (
                  <div className="space-y-3 pt-4">
                    <h3 className="text-lg font-bold text-gray-400">Completed</h3>
                    {completedTasksForDay.map((task) => (
                      <TaskCard key={task.id} task={task} onToggle={toggleTask} onDelete={deleteTask} />
                    ))}
                  </div>
                )}

                {tasksForDay.length === 0 && (
                  <div className="bg-gray-50 rounded-3xl p-12 text-center border border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-black mb-2">No tasks for this day</h3>
                    <p className="text-sm text-gray-500">Add a task to get started</p>
                  </div>
                )}
              </div>
            )}

            {!showAddTask && (
              <button
                onClick={() => setShowAddTask(true)}
                className="w-full bg-black text-white rounded-full py-4 px-6 font-semibold hover:bg-gray-900 transition-all duration-200 active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Task
              </button>
            )}

            {showAddTask && (
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-lg animate-slideIn">
                <h3 className="text-xl font-bold text-black mb-4">Create New Task</h3>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task name..."
                  className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-black mb-4"
                  autoFocus
                />
                
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Time</label>
                  {!showTimePicker ? (
                    <button
                      onClick={() => setShowTimePicker(true)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-left text-base hover:bg-gray-100 transition-colors"
                    >
                      {newTaskTime || "Select time..."}
                    </button>
                  ) : (
                    <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                      <div className="flex gap-2 justify-center mb-4">
                        <select
                          value={selectedHour}
                          onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <select
                          value={selectedMinute}
                          onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
                          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                            <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                          ))}
                        </select>
                        <select
                          value={selectedPeriod}
                          onChange={(e) => setSelectedPeriod(e.target.value as "AM" | "PM")}
                          className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-black"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                      <button
                        onClick={selectTimeFromPicker}
                        className="w-full bg-black text-white rounded-xl py-3 font-semibold hover:bg-gray-900 transition-all"
                      >
                        Set Time
                      </button>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["work", "personal", "family", "health"] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setNewTaskCategory(cat)}
                        className={`px-4 py-3 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
                          newTaskCategory === cat
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-600 mb-2 block">Priority</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["low", "medium", "high"] as const).map((pri) => (
                      <button
                        key={pri}
                        onClick={() => setNewTaskPriority(pri)}
                        className={`px-4 py-3 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
                          newTaskPriority === pri
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {pri}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center gap-3 mb-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTaskReminder}
                    onChange={(e) => setNewTaskReminder(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Set reminder</span>
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={addTask}
                    className="flex-1 bg-black text-white rounded-full py-3 font-semibold hover:bg-gray-900 transition-all duration-200 active:scale-[0.98]"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddTask(false);
                      setNewTaskTitle("");
                      setNewTaskTime("");
                      setNewTaskReminder(false);
                      setNewTaskCategory("personal");
                      setNewTaskPriority("medium");
                      setShowTimePicker(false);
                    }}
                    className="flex-1 bg-gray-100 text-black rounded-full py-3 font-semibold hover:bg-gray-200 transition-all duration-200 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Coach Tab */}
        {activeTab === "ai-coach" && (
          <div className="flex flex-col h-[calc(100vh-180px)] animate-fadeIn">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {chatMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-3xl px-5 py-4 ${
                      message.sender === "user"
                        ? "bg-black text-white"
                        : "bg-gray-100 text-black"
                    }`}
                  >
                    <p className="text-base leading-relaxed">{message.text}</p>
                    {message.action && message.action.status === "pending" && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <div className="bg-white rounded-2xl p-4 mb-3">
                          <p className="text-sm font-semibold text-black mb-2">
                            {message.action.type === "task" ? "📋 Task" : "✅ Habit"}
                          </p>
                          <p className="text-base text-black font-medium">
                            {message.action.data.title}
                          </p>
                          {message.action.data.time && (
                            <p className="text-sm text-gray-600 mt-1">
                              🕐 {message.action.data.time}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => confirmAction(message.id)}
                            className="flex-1 bg-green-600 text-white rounded-full py-2.5 text-sm font-semibold hover:bg-green-700 transition-all active:scale-95"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => cancelAction(message.id)}
                            className="flex-1 bg-gray-300 text-black rounded-full py-2.5 text-sm font-semibold hover:bg-gray-400 transition-all active:scale-95"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  onClick={() => quickReply("Add a task")}
                  className="px-4 py-2 bg-gray-100 text-black rounded-full text-sm font-semibold hover:bg-gray-200 transition-all whitespace-nowrap active:scale-95"
                >
                  Add a task
                </button>
                <button
                  onClick={() => quickReply("Review my day")}
                  className="px-4 py-2 bg-gray-100 text-black rounded-full text-sm font-semibold hover:bg-gray-200 transition-all whitespace-nowrap active:scale-95"
                >
                  Review my day
                </button>
                <button
                  onClick={() => quickReply("What should I improve?")}
                  className="px-4 py-2 bg-gray-100 text-black rounded-full text-sm font-semibold hover:bg-gray-200 transition-all whitespace-nowrap active:scale-95"
                >
                  What should I improve?
                </button>
                <button
                  onClick={() => quickReply("Motivate me")}
                  className="px-4 py-2 bg-gray-100 text-black rounded-full text-sm font-semibold hover:bg-gray-200 transition-all whitespace-nowrap active:scale-95"
                >
                  Motivate me
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask me anything..."
                  className="flex-1 px-5 py-4 bg-gray-100 border border-gray-200 rounded-full text-base focus:outline-none focus:ring-2 focus:ring-black"
                />
                <button
                  onClick={sendMessage}
                  disabled={!chatInput.trim()}
                  className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-900 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === "progress" && (
          <div className="px-6 pb-8 space-y-6 animate-fadeIn">
            <div className="space-y-2">
              <h1 className="text-5xl font-bold text-black tracking-tight">Progress</h1>
              <p className="text-lg text-gray-500">Track your journey</p>
            </div>

            <div className="bg-gradient-to-br from-black to-gray-800 rounded-3xl p-8 shadow-lg">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <Flame className="w-12 h-12 text-white" />
                </div>
                <div className="mb-2">
                  <span className="text-6xl font-bold text-white">{streak}</span>
                  <span className="text-2xl text-white/70 ml-2">days</span>
                </div>
                <p className="text-lg text-white/80 font-medium">Current Streak</p>
                <p className="text-sm text-white/60 mt-2">Keep going! You're building momentum</p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-black">Weekly Completion</h2>
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-end justify-between h-48 gap-2">
                  {weeklyData.map((value, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-gray-100 rounded-t-xl relative overflow-hidden" style={{ height: '100%' }}>
                        <div
                          className="absolute bottom-0 w-full bg-gradient-to-t from-black to-gray-700 rounded-t-xl transition-all duration-700"
                          style={{ height: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-500">{weekDays[index]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-black">Monthly Heatmap</h2>
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="grid grid-cols-7 gap-2">
                  {monthlyHeatmap.map((day) => (
                    <div
                      key={day.day}
                      className="aspect-square rounded-lg transition-all duration-300 hover:scale-110"
                      style={{
                        backgroundColor: day.value > 75 ? '#000000' : day.value > 50 ? '#4B5563' : day.value > 25 ? '#9CA3AF' : '#E5E7EB'
                      }}
                      title={`Day ${day.day}: ${day.value}%`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded bg-gray-200" />
                    <div className="w-4 h-4 rounded bg-gray-400" />
                    <div className="w-4 h-4 rounded bg-gray-600" />
                    <div className="w-4 h-4 rounded bg-black" />
                  </div>
                  <span>More</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-black">Habit Evolution</h2>
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="space-y-4">
                  {habits.slice(0, 3).map((habit) => (
                    <div key={habit.id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-black">{habit.title}</span>
                        <span className="text-xs text-gray-500">85% this month</span>
                      </div>
                      <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-black to-gray-600 rounded-full transition-all duration-700" style={{ width: '85%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-bold text-black">Task Consistency</h2>
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-4xl font-bold text-black">{taskCompletionRate}%</p>
                    <p className="text-sm text-gray-500 mt-1">Overall completion rate</p>
                  </div>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
                    <Award className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Completed</span>
                    <span className="font-semibold text-black">{completedTasks} tasks</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Remaining</span>
                    <span className="font-semibold text-black">{totalTasks - completedTasks} tasks</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 border border-gray-200 text-center">
              <Star className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-black mb-2">Keep It Up!</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                You're making consistent progress. Small daily wins lead to massive long-term results.
              </p>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="px-6 pb-8 space-y-6 animate-fadeIn">
            <div>
              <h1 className="text-5xl font-bold text-black mb-3 tracking-tight">Settings</h1>
              <p className="text-lg text-gray-500">Customize your experience</p>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center mb-5 border-4 border-white shadow-sm">
                  <User className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-2">Set Up Your Profile</h3>
                <p className="text-base text-gray-600 mb-6 max-w-xs">
                  Personalize your Flow AI experience and track your progress
                </p>
                <button className="px-8 py-3.5 bg-black text-white rounded-full font-semibold hover:bg-gray-900 transition-all duration-200 active:scale-95 shadow-lg">
                  Create Profile
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-black">Coaching Preferences</h2>
              
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                <label className="text-sm font-semibold text-gray-700 mb-3 block">Coaching Tone</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["strict", "balanced", "encouraging"] as const).map((tone) => (
                    <button
                      key={tone}
                      onClick={() => setCoachingTone(tone)}
                      className={`px-4 py-3 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${
                        coachingTone === tone
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-black">Notifications</h2>
              
              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                <button 
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-black" />
                    </div>
                    <span className="text-base font-medium text-black">Daily Reminders</span>
                  </div>
                  <div className={`w-12 h-7 rounded-full relative transition-colors ${notificationsEnabled ? "bg-black" : "bg-gray-300"}`}>
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${notificationsEnabled ? "right-1" : "left-1"}`} />
                  </div>
                </button>

                <button className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors active:scale-[0.99]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-black" />
                    </div>
                    <span className="text-base font-medium text-black">Task Alerts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base text-gray-500 font-medium">Enabled</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-black">Planning Preferences</h2>
              
              <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm">
                <button className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors border-b border-gray-100 active:scale-[0.99]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-black" />
                    </div>
                    <span className="text-base font-medium text-black">Default View</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base text-gray-500 font-medium capitalize">{defaultView}</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>

                <button className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors active:scale-[0.99]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Target className="w-5 h-5 text-black" />
                    </div>
                    <span className="text-base font-medium text-black">Start of Week</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base text-gray-500 font-medium">Sunday</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button className="w-full bg-white text-black rounded-full py-4 px-6 font-semibold hover:bg-gray-50 transition-all duration-200 active:scale-[0.98] border border-gray-200">
                Export Data
              </button>
              <button 
                onClick={() => setShowResetProgressConfirm(true)}
                className="w-full bg-red-50 text-red-600 rounded-full py-4 px-6 font-semibold hover:bg-red-100 transition-all duration-200 active:scale-[0.98] border border-red-100"
              >
                Reset Progress
              </button>
            </div>

            <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-black mb-2">Flow AI</h3>
              <p className="text-base text-gray-500 mb-1 font-medium">Version 1.0.0</p>
              <p className="text-sm text-gray-400 mt-4">Built for discipline and consistency</p>
              <div className="mt-6 space-y-2">
                <button className="text-sm text-gray-600 hover:text-black transition-colors">
                  Privacy Policy
                </button>
                <span className="text-gray-300 mx-2">·</span>
                <button className="text-sm text-gray-600 hover:text-black transition-colors">
                  Terms of Service
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100">
        <div className="max-w-md mx-auto px-4 py-2 safe-area-bottom">
          <div className="flex items-center justify-around">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-all duration-200 active:scale-95 ${ 
                activeTab === "home"
                  ? "text-black"
                  : "text-gray-400"
              }`}
            >
              <HomeIcon className="w-6 h-6" strokeWidth={activeTab === "home" ? 2.5 : 2} />
              <span className="text-xs font-semibold">Home</span>
            </button>

            <button
              onClick={() => setActiveTab("habits")}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-all duration-200 active:scale-95 ${ 
                activeTab === "habits"
                  ? "text-black"
                  : "text-gray-400"
              }`}
            >
              <CheckCircle2 className="w-6 h-6" strokeWidth={activeTab === "habits" ? 2.5 : 2} />
              <span className="text-xs font-semibold">Habits</span>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-all duration-200 active:scale-95 ${ 
                activeTab === "tasks"
                  ? "text-black"
                  : "text-gray-400"
              }`}
            >
              <Calendar className="w-6 h-6" strokeWidth={activeTab === "tasks" ? 2.5 : 2} />
              <span className="text-xs font-semibold">Tasks</span>
            </button>

            <button
              onClick={() => setActiveTab("ai-coach")}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-all duration-200 active:scale-95 ${ 
                activeTab === "ai-coach"
                  ? "text-black"
                  : "text-gray-400"
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${ 
                activeTab === "ai-coach" ? "bg-black" : "bg-gray-300"
              }`}>
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold">Coach</span>
            </button>

            <button
              onClick={() => setActiveTab("progress")}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-all duration-200 active:scale-95 ${ 
                activeTab === "progress"
                  ? "text-black"
                  : "text-gray-400"
              }`}
            >
              <BarChart3 className="w-6 h-6" strokeWidth={activeTab === "progress" ? 2.5 : 2} />
              <span className="text-xs font-semibold">Progress</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex flex-col items-center gap-1 py-2 px-3 transition-all duration-200 active:scale-95 ${ 
                activeTab === "settings"
                  ? "text-black"
                  : "text-gray-400"
              }`}
            >
              <SettingsIcon className="w-6 h-6" strokeWidth={activeTab === "settings" ? 2.5 : 2} />
              <span className="text-xs font-semibold">Settings</span>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }

        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }

        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

// Habit Card Component
function HabitCard({ 
  habit, 
  onToggle, 
  onDelete, 
  onEdit,
  isEditing,
  editValue,
  setEditValue,
  onSaveEdit
}: { 
  habit: Habit; 
  onToggle: (id: string) => void; 
  onDelete: (id: string) => void;
  onEdit: (id: string, title: string) => void;
  isEditing: boolean;
  editValue: string;
  setEditValue: (value: string) => void;
  onSaveEdit: (id: string) => void;
}) {
  const colors = habit.category ? CATEGORY_COLORS[habit.category] : CATEGORY_COLORS.personal;
  
  return (
    <div
      className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-5 hover:shadow-md transition-all duration-200 ${
        habit.completed ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={() => onToggle(habit.id)}
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
            habit.completed
              ? "bg-black border-black"
              : `border-gray-300 bg-white hover:${colors.border}`
          }`}
        >
          {habit.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={() => onSaveEdit(habit.id)}
              onKeyPress={(e) => e.key === "Enter" && onSaveEdit(habit.id)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
            />
          ) : (
            <p className={`text-base font-medium ${habit.completed ? "text-gray-500 line-through" : colors.text}`}>
              {habit.title}
            </p>
          )}
        </div>
        <button
          onClick={() => onEdit(habit.id, habit.title)}
          className={`p-2 ${colors.icon} hover:opacity-70 transition-opacity active:scale-95`}
        >
          <Edit2 className="w-5 h-5" />
        </button>
        <button
          onClick={() => onDelete(habit.id)}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors active:scale-95"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// Task Card Component
function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: (id: string) => void; onDelete: (id: string) => void }) {
  const categoryColors = task.category ? TASK_CATEGORY_COLORS[task.category] : { bg: "bg-gray-100", text: "text-gray-700" };
  
  return (
    <div
      className={`bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition-all duration-200 ${
        task.completed ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={() => onToggle(task.id)}
          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 mt-0.5 ${
            task.completed
              ? "bg-black border-black"
              : "border-gray-300 bg-white hover:border-gray-400"
          }`}
        >
          {task.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className={`text-base font-medium ${task.completed ? "text-gray-400 line-through" : "text-black"}`}>
              {task.title}
            </p>
            {task.priority === "high" && !task.completed && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                High
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {task.time && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{task.time}</span>
              </div>
            )}
            {task.reminder && (
              <div className="flex items-center gap-1">
                <Bell className="w-4 h-4" />
              </div>
            )}
            {task.category && (
              <span className={`px-2 py-1 ${categoryColors.bg} ${categoryColors.text} text-xs font-semibold rounded-full capitalize`}>
                {task.category}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => onDelete(task.id)}
          className="p-2 text-gray-400 hover:text-red-500 transition-colors active:scale-95"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
