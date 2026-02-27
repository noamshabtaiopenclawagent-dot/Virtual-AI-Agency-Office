
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PhysicalOffice } from './components/PhysicalOffice';
import { Agent, ChatMessage, OfficeState, Task, Memory, LogEntry, CronJob, Artifact, Goal, Position, InternalMessage, AgentMood } from './types';
import { ROOMS } from './constants';
import Character from './components/Character';
import Desk from './components/Desk';
import OfficeLog from './components/OfficeLog';
import { ResearchHub } from './components/ResearchHub';
import { SecurityCenter } from './components/SecurityCenter';
import CommandCenter from './components/CommandCenter';
import { getGeminiResponse } from './services/geminiService';
import { supabase } from './services/supabaseService';
import { fetchOfficeAgents, fetchOfficeTasks, fetchDailyCost, fetchOfficeGoals, fetchProposals, fetchCronJobs, fetchOfficeMemories, fetchOfficeLogs, fetchCapabilities, fetchModels, fetchSystemHealth, fetchSecurityIssues, fetchArtifacts, fetchMarketData, subscribeToTasks, subscribeToAgents } from './services/opiDataService';
import { fetchAllResearch, fetchResearchByCategory, RESEARCH_TABS } from './services/researchService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { 
  LayoutDashboard, 
  ListTodo, 
  Wrench, 
  BrainCircuit, 
  Stamp, 
  Activity, 
  ScrollText, 
  Building2, 
  Network, 
  Archive, 
  Database, 
  Clock,
  Menu,
  X,
  Mic,
  Search,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Bot
} from 'lucide-react';

const ROOM_THEMES: Record<string, string> = {
  CEO_OFFICE: 'rgba(234, 179, 8, 0.04)',
  WAR_ROOM: 'rgba(168, 85, 247, 0.04)',
  WORKING_AREA: 'rgba(59, 130, 246, 0.04)',
  LOUNGE: 'rgba(34, 197, 94, 0.04)',
};

const OpenClawLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
    <path d="M12 2L4.5 9M12 2L19.5 9M12 2V22M12 22L4.5 15M12 22L19.5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 12L22 12M2 12L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const App: React.FC = () => {
  // Initialize with EMPTY state - fetch from Supabase on mount
  const [state, setState] = useState<OfficeState>({
    agents: [],
    messages: [],
    tasks: [],
    dailyCost: { total: "$0.00", breakdown: [] },
    goals: [],
    memories: [],
    logs: [],
    artifacts: [],
    internalMessages: [],
    proposals: [],
    research: [],
    securityIssues: [],
    marketData: [],
    capabilities: [],
    models: [],
    cronJobs: [],
    selectedAgentId: null,
    activeTab: 'Dashboard',
  });

  const [isRecording, setIsRecording] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isTyping, setIsTyping] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // Main simulation loop
    useEffect(() => {
      const simulationInterval = setInterval(() => {
        setState(prev => {
          const newAgents = prev.agents.map(agent => {
            const assignedTask = prev.tasks.find(t => t.assigneeId === agent.id && t.status !== 'DONE');
            let newStatus = agent.status;
            let newMood = agent.mood;

            if (assignedTask) {
              if (canStartTask(assignedTask, prev.tasks)) {
                if (assignedTask.status === 'TODO' || assignedTask.status === 'STUCK') {
                  updateTaskStatus(assignedTask.id, 'IN_PROGRESS');
                  newStatus = 'WORKING';
                  newMood = 'FOCUSED';
                }
              } else {
                if (assignedTask.status !== 'STUCK') {
                  updateTaskStatus(assignedTask.id, 'STUCK');
                }
                newStatus = 'IDLE';
                newMood = 'STRESSED';
              }
            } else {
              newStatus = 'IDLE';
            }

            // Random mood change if idle
            if (newStatus === 'IDLE' && Math.random() < 0.05) {
              const moods: AgentMood[] = ['FOCUSED', 'SOCIAL', 'STRESSED'];
              newMood = moods[Math.floor(Math.random() * moods.length)];
            }

            return { ...agent, status: newStatus, mood: newMood };
          });

          return { ...prev, agents: newAgents };
        });
      }, 2000); // Task logic runs every 2 seconds

      const moveInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          agents: prev.agents.map(agent => {
            if (!agent.currentPosition || !agent.homePosition) return agent;
            
            // Movement logic remains the same, driven by the new mood
            const isAtDesk = Math.sqrt(
              Math.pow(agent.currentPosition.x - agent.homePosition.x, 2) + 
              Math.pow(agent.currentPosition.y - agent.homePosition.y, 2)
            ) < 1;

            switch (agent.mood) {
              case 'SOCIAL':
                if (Math.random() < 0.2) {
                  const lounge = ROOMS.find(r => r.id === 'LOUNGE');
                  if (!lounge) return agent;
                  const targetX = lounge.x + 10 + Math.random() * (lounge.w - 20);
                  const targetY = lounge.y + 10 + Math.random() * (lounge.h - 20);
                  return {
                    ...agent,
                    currentPosition: { x: targetX, y: targetY },
                    isFacingLeft: targetX < agent.currentPosition.x,
                    currentActivity: 'Socializing',
                  };
                }
                break;
              case 'STRESSED':
                if (isAtDesk && Math.random() < 0.3) {
                  const room = ROOMS.find(r => r.id === agent.room);
                  if (!room) return agent;
                  const targetX = room.x + Math.random() * room.w;
                  const targetY = room.y + Math.random() * room.h;
                  return {
                    ...agent,
                    currentPosition: { x: targetX, y: targetY },
                    isFacingLeft: targetX < agent.currentPosition.x,
                    currentActivity: 'Pacing',
                  };
                }
                break;
              case 'FOCUSED':
              default:
                if (!isAtDesk) {
                  return {
                    ...agent,
                    currentPosition: { ...agent.homePosition },
                    isFacingLeft: agent.homePosition.x < agent.currentPosition.x,
                    currentActivity: 'Deep Work',
                  };
                }
                break;
            }
            return agent;
          })
        }));
      }, 6000); // Movement logic runs every 6 seconds

      return () => {
        clearInterval(simulationInterval);
        clearInterval(moveInterval);
      };
    }, []);

  // Helper for normalizing Supabase data (snake_case to camelCase)
  const normalizeData = useCallback((data: any[], type: string): any[] => {
    return data.map(item => {
      const normalized: any = { ...item };
      
      if (type === 'agent') {
        normalized.currentPosition = item.currentPosition || item.current_position || { x: 50, y: 50 };
        normalized.homePosition = item.homePosition || item.home_position || { x: 50, y: 50 };
        normalized.currentActivity = item.currentActivity || item.current_activity || 'Idle';
        normalized.isFacingLeft = item.isFacingLeft !== undefined ? item.isFacingLeft : item.is_facing_left !== undefined ? item.is_facing_left : false;
        normalized.trustScore = item.trustScore || item.trust_score || 50;
        normalized.systemPrompt = item.systemPrompt || item.system_prompt || '';
        normalized.parentId = item.parentId || item.parent_id;
      } else if (type === 'task') {
        normalized.assigneeId = item.assigneeId || item.assignee_id;
        normalized.dueDate = item.dueDate || item.due_date;
      } else if (type === 'artifact') {
        normalized.creatorId = item.creatorId || item.creator_id;
      } else if (type === 'memory') {
        normalized.agentId = item.agentId || item.agent_id;
      } else if (type === 'cron') {
        normalized.nextRun = item.nextRun || item.next_run;
        normalized.lastRunStatus = item.lastRunStatus || item.last_run_status;
      } else if (type === 'log') {
        normalized.agentId = item.agentId || item.agent_id;
      }
      
      return normalized;
    });
  }, []);

  // Fetch initial data from OPI Supabase
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const [agents, tasks, goals, memories, logs, research, securityIssues, marketData, artifacts, cronJobs, proposals, capabilities, models, systemHealth, dailyCost] = await Promise.all([
          fetchOfficeAgents(),
          fetchOfficeTasks(),
          fetchOfficeGoals(),
          fetchOfficeMemories(),
          fetchOfficeLogs(),
          fetchAllResearch(),
          fetchSecurityIssues(),
          fetchMarketData(),
          fetchArtifacts(),
          fetchProposals(),
          fetchCronJobs(),
          fetchCapabilities(),
          fetchModels(),
          fetchSystemHealth(),
          fetchDailyCost(),
        ]);

        setState(prev => ({
          ...prev,
          agents: agents.length > 0 ? agents : prev.agents,
          tasks: tasks.length > 0 ? tasks : prev.tasks,
          goals: goals.length > 0 ? goals : prev.goals,
          memories: memories.length > 0 ? memories : prev.memories,
          logs: logs.length > 0 ? logs : prev.logs,
          research: research,
          securityIssues: securityIssues,
          marketData: marketData,
          artifacts: artifacts,
          cronJobs: cronJobs,
          proposals: proposals,
          capabilities: capabilities,
          models: models,
          dailyCost: dailyCost || { total: "$0.00", breakdown: [] },
          systemHealth: systemHealth || { status: "UNKNOWN", uptime: "0", responseTime: "0", errorRate: "0", activeTasks: 0 },
        }));

        // Set additional state for non-task data
        console.log("Capabilities:", capabilities.length);
        console.log("Models:", models.length);
        console.log("SystemHealth:", systemHealth.status);
        console.log("Proposals count:", proposals?.length || 0);
        console.log("Proposals sample:", proposals?.[0]);
        console.log("Proposals:", proposals?.length || 0);

      } catch (error) {
        console.error('Error fetching initial state from OPI Supabase:', error);
      }
    };

    fetchInitialState();
  }, []);

  // Real-time subscriptions from OPI
  useEffect(() => {
    const channel = subscribeToTasks((payload) => {
      console.log('Task change received from OPI!', payload);
      setState(prev => {
        const tasks = [...prev.tasks];
        if (payload.eventType === 'INSERT') {
          return { ...prev, tasks: [...tasks, { id: String(payload.new.id), title: payload.new.title, assigneeId: payload.new.owner || '1', status: 'TODO', priority: (payload.new.priority as any) || 'MEDIUM', dueDate: payload.new.deadline || '' }] };
        }
        if (payload.eventType === 'UPDATE') {
          const index = tasks.findIndex(t => t.id === String(payload.old.id));
          if (index !== -1) {
            tasks[index] = { ...tasks[index], status: (payload.new.status as any) || tasks[index].status };
          }
          return { ...prev, tasks };
        }
        return prev;
      });
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Real-time subscriptions for Agents
  useEffect(() => {
    const channel = supabase
      .channel('realtime-agents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        (payload) => {
          console.log('Agent change received!', payload);
          setState(prev => {
            const agents = [...prev.agents];
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const normalized = normalizeData([payload.new], 'agent')[0];

              if (payload.eventType === 'INSERT') {
                return { ...prev, agents: [...agents, normalized] };
              } else {
                const index = agents.findIndex(a => a.id === payload.old.id);
                if (index !== -1) {
                  agents[index] = normalized;
                }
                return { ...prev, agents };
              }
            }
            if (payload.eventType === 'DELETE') {
              return { ...prev, agents: agents.filter(a => a.id !== payload.old.id) };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({
      x: (e.clientX / window.innerWidth - 0.5) * 20,
      y: (e.clientY / window.innerHeight - 0.5) * 20
    });
  };

  const canStartTask = (task: Task, allTasks: Task[]): boolean => {
    if (!task.dependencies || task.dependencies.length === 0) {
      return true;
    }
    return task.dependencies.every(depId => {
      const dependency = allTasks.find(t => t.id === depId);
      return dependency ? dependency.status === 'DONE' : true;
    });
  };

  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setState(prev => ({ 
          ...prev, 
          tasks: prev.tasks.map(t => t.id === taskId ? data as Task : t),
        }));
      }
    } catch (error) {
      console.error('Error updating task status in Supabase:', error);
    }
  };

  const addTaskToSupabase = async (task: Omit<Task, 'id'>) => {
    try {
      const success = await createOfficeTask({
        id: Date.now().toString(),
        ...task,
      });

      if (success) {
        const tasks = await fetchOfficeTasks();
        setState(prev => ({ 
          ...prev, 
          tasks: tasks,
        }));
      }
    } catch (error) {
      console.error('Error adding task to OPI Supabase:', error);
    }
  };

  const handleVoiceCommand = async () => {
    if (isRecording) return;
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      const fakeTranscription = "OPI, set a high priority task for Dev to optimize the Org Tree rendering and update the roadmap.";
      
      const newTask: Omit<Task, 'id'> = { 
        title: 'Optimize Org Tree Rendering', 
        assigneeId: '5', // Dev's ID
        status: 'TODO', 
        priority: 'HIGH', 
        dueDate: '2024-12-31' 
      };

      addTaskToSupabase(newTask);

      const newLog: LogEntry = { 
        id: Date.now().toString(), 
        timestamp: Date.now(), 
        agentId: 'SYSTEM', 
        message: `Voice Command Processed: ${fakeTranscription}`,
        type: 'SUCCESS'
      };

      setState(prev => ({ 
        ...prev, 
        logs: [newLog, ...prev.logs], 
        activeTab: 'Tasks'
      }));
    }, 3000);
  };

  const handleProposalAction = (proposalId: string, action: 'approve' | 'reject') => {
    const proposal = state.proposals.find(p => p.id === proposalId);
    if (!proposal) return;

    setState(prev => ({
      ...prev,
      proposals: prev.proposals.map(p => 
        p.id === proposalId ? { ...p, status: action === 'approve' ? 'approved' : 'rejected' } : p
      ),
      logs: [
        {
          id: Date.now().toString(),
          timestamp: Date.now(),
          agentId: 'SYSTEM',
          message: `Proposal "${proposal.title}" has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
          type: action === 'approve' ? 'SUCCESS' : 'WARNING',
        },
        ...prev.logs,
      ],
    }));

    if (action === 'approve') {
      // Create tasks for the assigned agents
      const newTasks: Task[] = proposal.agents.map(agentName => {
        const agent = state.agents.find(a => a.name === agentName);
        return {
          id: `task-${Date.now()}-${agentName}`,
          title: `[${proposal.title}] - ${agentName}'s role`,
          assigneeId: agent ? agent.id : 'unassigned',
          status: 'TODO',
          priority: proposal.impact === 'Critical' || proposal.impact === 'High' ? 'HIGH' : 'MEDIUM',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        };
      });

      setState(prev => ({
        ...prev,
        tasks: [...newTasks, ...prev.tasks],
      }));
    }
  };

  const handleSendMessage = async (text: string, agentId: string) => {
    if (!text.trim() || isTyping) return;
    const agent = state.agents.find(a => a.id === agentId)!;
    setIsTyping(true);
    const response = await getGeminiResponse(text, agent.systemPrompt);
    const agentMsg: ChatMessage = { id: Date.now().toString(), senderId: agent.id, senderName: agent.name, text: response, timestamp: Date.now(), role: 'model' };
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, agentMsg],
      agents: prev.agents.map(a => a.id === agent.id ? { ...a, status: 'THINKING' } : a)
    }));
    setIsTyping(false);
    setTimeout(() => {
      setState(prev => ({ ...prev, agents: prev.agents.map(a => a.id === agent.id ? { ...a, status: 'IDLE' } : a) }));
    }, 1500);
  };

  const handleSavePrompt = () => {
    if (!state.selectedAgentId) return;
    setState(prev => ({
      ...prev,
      agents: prev.agents.map(a => 
        a.id === state.selectedAgentId ? { ...a, systemPrompt: promptText } : a
      ),
      logs: [
        {
          id: Date.now().toString(),
          timestamp: Date.now(),
          agentId: 'SYSTEM',
          message: `System Prompt updated for agent ${state.selectedAgentId}.`,
          type: 'SUCCESS'
        },
        ...prev.logs
      ]
    }));
    setIsEditingPrompt(false);
  };

  // --- AGENT SIMULATION LOOP ---
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setState(prev => {
        const newAgents = prev.agents.map(agent => {
          // 30% chance to move if not currently working on a critical task
          if (Math.random() > 0.7 && agent.status !== 'WORKING') {
            // Find agent's room
            const room = ROOMS.find(r => r.id === agent.room);
            if (room) {
              // Pick random spot in room (with some padding)
              const padding = 5;
              const newX = room.x + padding + Math.random() * (room.w - padding * 2);
              const newY = room.y + padding + Math.random() * (room.h - padding * 2);
              
              return {
                ...agent,
                currentPosition: { x: newX, y: newY },
                isFacingLeft: newX < agent.currentPosition.x
              };
            }
          }
          return agent;
        });
        return { ...prev, agents: newAgents };
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(moveInterval);
  }, []);

  return (
    <div className="h-screen w-screen flex bg-[#030305] text-zinc-400 overflow-hidden font-sans rtl selection:bg-blue-500/20" onMouseMove={handleMouseMove}>
      <div className="film-grain"></div>
      <div className="scanlines absolute inset-0 z-[100] pointer-events-none"></div>
      
      {/* GLOBAL NAVIGATION SIDEBAR (Desktop Only) */}
      <aside className={`hidden lg:flex ${isSidebarCollapsed ? 'w-20' : 'w-80'} glass border-l border-white/5 flex-col z-50 shadow-[25px_0_60px_rgba(0,0,0,0.8)] transition-all duration-500 ease-in-out`}>
        <div className={`p-8 flex flex-col gap-1 ${isSidebarCollapsed ? 'items-center' : ''}`}>
           <div className="flex justify-between items-center w-full">
              {!isSidebarCollapsed && (
                 <div>
                    <div className="text-white text-4xl font-black tracking-tighter">NEXUS<span className="text-blue-500">.</span></div>
                    <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.5em] opacity-40">Command Center</div>
                 </div>
              )}
              {isSidebarCollapsed && <div className="text-white text-2xl font-black tracking-tighter mb-4">N<span className="text-blue-500">.</span></div>}
              
              <button 
                 onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                 className={`w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 transition-colors ${isSidebarCollapsed ? 'mb-2' : ''}`}
              >
                 {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
           </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
           {[
             { id: 'Dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
             { id: 'CommandCenter', label: 'מרכז פקודות', icon: Bot },
             { id: 'Security', label: 'אבטחת סייבר', icon: ShieldAlert },
             { id: 'Research', label: 'מרכז מחקר', icon: BrainCircuit },
             { id: 'Physical', label: 'משרד ויזואלי', icon: Building2 },
             { id: 'Tasks', label: 'ניהול משימות', icon: ListTodo },
             { id: 'OrgTree', label: 'עץ ארגוני', icon: Network },
             { id: 'Artifacts', label: 'ארכיון תוצרים', icon: Archive },
             { id: 'Memory', label: 'זיכרון ליבה', icon: Database },
             { id: 'Cron', label: 'אוטומציות (Cron)', icon: Clock },
             { id: 'Logs', label: 'לוגים חיים', icon: ScrollText },
             { id: 'Capabilities', label: 'יכולות וכלים', icon: Wrench },
             { id: 'Models', label: 'מוניטור מודלים', icon: BrainCircuit },
             { id: 'Approvals', label: 'מרכז חשיבה ואישורים', icon: Stamp },
             { id: 'SystemHealth', label: 'בריאות מערכת', icon: Activity }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setState(s => ({ ...s, activeTab: tab.id as any }))}
               className={`w-full text-right px-4 py-3 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300 group flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}
                 ${state.activeTab === tab.id 
                   ? 'bg-blue-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.3)]' 
                   : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}
               title={isSidebarCollapsed ? tab.label : ''}
             >
                <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
                   <tab.icon size={20} className={`${state.activeTab === tab.id ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-300'} transition-colors`} />
                   {!isSidebarCollapsed && <span>{tab.label}</span>}
                </div>
                {!isSidebarCollapsed && state.activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_#fff]"></div>}
             </button>
           ))}
        </nav>

        <div className={`p-6 bg-black/40 border-t border-white/5 ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
           {!isSidebarCollapsed ? (
              <>
                 <div className="flex justify-between items-center mb-4">
                    <div className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">Global Status</div>
                    <div className="flex gap-1">
                       <div className="w-1 h-3 bg-green-500 rounded-full animate-pulse"></div>
                       <div className="w-1 h-3 bg-green-500/40 rounded-full"></div>
                    </div>
                 </div>
                 <div className="text-[9px] font-mono text-zinc-500 opacity-50 space-y-1">
                    <div>Uptime: 99.998%</div>
                    <div>Active Agents: {state.agents.length}</div>
                 </div>
              </>
           ) : (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="System Online"></div>
           )}
        </div>
      </aside>

      {/* MOBILE HAMBURGER MENU OVERLAY */}
      <div className={`lg:hidden fixed inset-0 z-[200] pointer-events-none transition-all duration-500 ${isMobileMenuOpen ? 'pointer-events-auto' : ''}`}>
         {/* Backdrop */}
         <div className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-500 ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setIsMobileMenuOpen(false)}></div>
         
         {/* Menu Content */}
         <div className={`absolute top-0 right-0 bottom-0 w-[80%] max-w-sm bg-[#0a0a0c] border-l border-white/10 shadow-2xl transform transition-transform duration-500 flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
               <div>
                  <div className="text-white text-2xl font-black tracking-tighter">NEXUS<span className="text-blue-500">.</span></div>
                  <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-[0.5em]">Mobile Command</div>
               </div>
               <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white">
                  <X size={20} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
               {[
                  { id: 'Dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
                  { id: 'Security', label: 'אבטחת סייבר', icon: ShieldAlert },
                  { id: 'Research', label: 'מרכז מחקר', icon: BrainCircuit },
                  { id: 'Tasks', label: 'ניהול משימות', icon: ListTodo },
                  { id: 'Capabilities', label: 'יכולות וכלים', icon: Wrench },
                  { id: 'Models', label: 'מוניטור מודלים', icon: BrainCircuit },
                  { id: 'Approvals', label: 'מרכז אישורים', icon: Stamp },
                  { id: 'SystemHealth', label: 'בריאות מערכת', icon: Activity },
                  { id: 'Logs', label: 'לוגים חיים', icon: ScrollText },
                  { id: 'Physical', label: 'משרד ויזואלי', icon: Building2 },
                  { id: 'OrgTree', label: 'עץ ארגוני', icon: Network },
                  { id: 'Artifacts', label: 'ארכיון תוצרים', icon: Archive },
                  { id: 'Memory', label: 'זיכרון ליבה', icon: Database },
                  { id: 'Cron', label: 'אוטומציות', icon: Clock },
               ].map(tab => (
                  <button
                     key={tab.id}
                     onClick={() => {
                        setState(s => ({ ...s, activeTab: tab.id as any }));
                        setIsMobileMenuOpen(false);
                     }}
                     className={`w-full text-right px-6 py-4 rounded-xl transition-all duration-300 flex items-center justify-between group
                        ${state.activeTab === tab.id 
                           ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400' 
                           : 'hover:bg-white/5 text-zinc-400 hover:text-white border border-transparent'}`}
                  >
                     <div className="flex items-center gap-4">
                        <tab.icon size={20} className={`transition-opacity ${state.activeTab === tab.id ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                        <span className="text-sm font-bold uppercase tracking-wide">{tab.label}</span>
                     </div>
                     {state.activeTab === tab.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"></div>}
                  </button>
               ))}
            </div>

            <div className="p-6 border-t border-white/5 bg-black/20">
               <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System Online</span>
               </div>
               <div className="text-[10px] text-zinc-700 font-mono">v2.5.0-mobile-build</div>
            </div>
         </div>
      </div>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 flex flex-col relative overflow-hidden pb-0 lg:pb-0">
        
        {/* HEADER */}
        <header className="h-20 lg:h-32 px-4 lg:px-16 flex items-center justify-between z-40 relative border-b border-white/5 bg-black/20 backdrop-blur-md lg:bg-transparent">
           <div className="flex items-center gap-4">
              {/* Hamburger Button */}
              <button 
                 onClick={() => setIsMobileMenuOpen(true)}
                 className="lg:hidden w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 transition-transform text-white"
              >
                 <Menu size={20} />
              </button>

              <div className="flex flex-col">
                 <h1 className="text-white text-xl lg:text-4xl font-light tracking-tight">{state.activeTab}</h1>
                 <div className="hidden lg:block text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-1">Strategic Control Layer Activated</div>
              </div>
           </div>
        </header>

        {/* DYNAMIC TAB CONTENT */}
        <section className={`flex-1 overflow-y-auto custom-scrollbar relative z-10 ${state.activeTab === 'Physical' ? 'p-0' : 'p-6 lg:p-16'}`}>
           
           {/* 1. DASHBOARD - MANAGER COCKPIT */}
           {state.activeTab === 'Dashboard' && (
              <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                 
                 {/* SECTION 1: CRITICAL METRICS (Actionable) */}
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                    {/* Pending Approvals */}
                    <button 
                       onClick={() => setState(s => ({ ...s, activeTab: 'Approvals' }))}
                       className="glass p-5 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-all group text-left relative overflow-hidden"
                    >
                       <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Stamp size={60} />
                       </div>
                       <div className="flex justify-between items-start mb-2">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pending Approvals</div>
                          <div className={`w-2 h-2 rounded-full ${(Array.isArray(state.proposals) ? state.proposals : []).filter(p => p.status === 'pending').length > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-zinc-800'}`}></div>
                       </div>
                       <div className="text-3xl font-black text-white mb-1">{(Array.isArray(state.proposals) ? state.proposals : []).filter(p => p.status === 'pending').length}</div>
                       <div className="text-[10px] text-zinc-600">Requires immediate review</div>
                    </button>

                    {/* Stuck Tasks */}
                    <button 
                       onClick={() => setState(s => ({ ...s, activeTab: 'Tasks' }))}
                       className="glass p-5 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all group text-left relative overflow-hidden"
                    >
                       <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <ListTodo size={60} />
                       </div>
                       <div className="flex justify-between items-start mb-2">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Blocked Tasks</div>
                          <div className={`w-2 h-2 rounded-full ${state.tasks.filter(t => t.status === 'open').length > 0 ? 'bg-red-500 animate-pulse' : 'bg-zinc-800'}`}></div>
                       </div>
                       <div className="text-3xl font-black text-white mb-1">{state.tasks.filter(t => t.status === 'open').length}</div>
                       <div className="text-[10px] text-zinc-600">High priority bottlenecks</div>
                    </button>

                    {/* Daily Cost */}
                    <button 
                       onClick={() => setState(s => ({ ...s, activeTab: 'Models' }))}
                       className="glass p-5 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all group text-left relative overflow-hidden"
                    >
                       <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <BrainCircuit size={60} />
                       </div>
                       <div className="flex justify-between items-start mb-2">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Daily Spend</div>
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                       </div>
                       <div className="text-3xl font-black text-white mb-1">{state.dailyCost.total}</div>
                       <div className="text-[10px] text-zinc-600">28% of daily budget</div>
                    </button>

                    {/* System Health */}
                    <button 
                       onClick={() => setState(s => ({ ...s, activeTab: 'SystemHealth' }))}
                       className="glass p-5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group text-left relative overflow-hidden"
                    >
                       <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                          <Activity size={60} />
                       </div>
                       <div className="flex justify-between items-start mb-2">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">System Health</div>
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                       </div>
                       <div className="text-3xl font-black text-white mb-1">98%</div>
                       <div className="text-[10px] text-zinc-600">All systems operational</div>
                    </button>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* SECTION 2: TEAM OVERVIEW (Who is doing what?) */}
                    <div className="lg:col-span-2 glass rounded-3xl p-6 lg:p-8 border border-white/5">
                       <div className="flex justify-between items-center mb-6">
                          <h2 className="text-white text-lg font-bold flex items-center gap-2">
                             <Network size={18} className="text-blue-500" />
                             Team Status
                          </h2>
                          <span className="text-[10px] text-zinc-500 font-mono uppercase">{state.agents.filter(a => a.status !== 'IDLE').length} Active Agents</span>
                       </div>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {state.agents.map(agent => {
                             const activeTask = state.tasks.find(t => t.assigneeId === agent.id && t.status === 'IN_PROGRESS');
                             return (
                                <div key={agent.id} className="bg-white/[0.02] p-4 rounded-2xl border border-white/5 flex items-center gap-4 hover:bg-white/[0.04] transition-colors">
                                   <div className="relative">
                                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10">
                                         <img src={agent.avatar} className="w-full h-full object-cover" />
                                      </div>
                                      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a0a0c] ${agent.status === 'IDLE' ? 'bg-zinc-500' : agent.status === 'THINKING' ? 'bg-purple-500 animate-pulse' : 'bg-green-500'}`}></div>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-center mb-0.5">
                                         <span className="text-white font-bold text-sm truncate">{agent.name}</span>
                                         <span className={`text-[9px] font-bold uppercase tracking-wider ${agent.mood === 'STRESSED' ? 'text-red-400' : 'text-zinc-500'}`}>{agent.mood}</span>
                                      </div>
                                      <div className="text-[10px] text-zinc-400 truncate">
                                         {activeTask ? (
                                            <span className="text-blue-400 flex items-center gap-1">
                                               <Activity size={10} /> {activeTask.title}
                                            </span>
                                         ) : (
                                            <span className="opacity-50">Idle - Standing by</span>
                                         )}
                                      </div>
                                   </div>
                                </div>
                             );
                          })}
                       </div>
                    </div>

                    {/* SECTION 3: RECENT CRITICAL EVENTS */}
                    <div className="glass rounded-3xl p-6 lg:p-8 border border-white/5 flex flex-col">
                       <div className="flex justify-between items-center mb-6">
                          <h2 className="text-white text-lg font-bold flex items-center gap-2">
                             <Activity size={18} className="text-orange-500" />
                             Critical Events
                          </h2>
                       </div>
                       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 max-h-[400px]">
                          {state.logs
                             .filter(l => l.type === 'ERROR' || l.type === 'WARNING' || l.message.includes('Proposal'))
                             .slice(0, 8)
                             .map(log => (
                             <div key={log.id} className="flex gap-3 relative pl-4 border-l border-white/10">
                                <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#0a0a0c] ${log.type === 'ERROR' ? 'bg-red-500' : log.type === 'WARNING' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                      <span className="text-[9px] font-mono text-zinc-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                      <span className="text-[9px] font-bold text-zinc-400 uppercase">{state.agents.find(a => a.id === log.agentId)?.name || 'SYSTEM'}</span>
                                   </div>
                                   <p className="text-xs text-zinc-300 leading-relaxed">{log.message}</p>
                                </div>
                             </div>
                          ))}
                          {state.logs.filter(l => l.type === 'ERROR' || l.type === 'WARNING').length === 0 && (
                             <div className="text-center py-10 text-zinc-600 text-xs">No critical events to report.</div>
                          )}
                       </div>
                    </div>
                 </div>

                 {/* SECTION 4: GOAL PROGRESS (Strategic View) */}
                 <div className="glass rounded-3xl p-6 lg:p-8 border border-white/5">
                    <h2 className="text-white text-lg font-bold mb-6 flex items-center gap-2">
                       <Building2 size={18} className="text-purple-500" />
                       Strategic Goals Progress
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {state.goals.map(goal => (
                          <div key={goal.id} className="bg-white/[0.02] p-5 rounded-2xl border border-white/5">
                             <div className="flex justify-between items-start mb-4">
                                <span className="text-white text-sm font-bold">{goal.title}</span>
                                <span className={`text-xs font-mono font-bold ${goal.progress >= 80 ? 'text-green-400' : goal.progress >= 50 ? 'text-blue-400' : 'text-zinc-500'}`}>{goal.progress}%</span>
                             </div>
                             <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-1000 ${goal.progress >= 80 ? 'bg-green-500' : goal.progress >= 50 ? 'bg-blue-500' : 'bg-zinc-500'}`} style={{width: `${goal.progress}%`}}></div>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           )}

           {/* 2. TASK BOARD (Monday Style) */}
           {state.activeTab === 'Tasks' && (
              <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
                 <div className="flex justify-between items-center mb-6 lg:mb-10">
                    <h2 className="text-white text-xl lg:text-3xl font-bold">Master Task Board</h2>
                    <button className="px-4 lg:px-8 py-2 lg:py-3 bg-blue-600 rounded-xl text-[9px] lg:text-[11px] font-bold text-white uppercase tracking-widest hover:bg-blue-500 transition-all">+ New</button>
                 </div>

                 {/* Desktop Table View */}
                 <div className="hidden lg:block glass rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl">
                    <table className="w-full text-right border-collapse">
                       <thead className="bg-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          <tr>
                             <th className="p-6">Item Name</th>
                             <th className="p-6">Assignee</th>
                             <th className="p-6">Status</th>
                             <th className="p-6">Priority</th>
                             <th className="p-6">Due Date</th>
                             <th className="p-6">Tags</th>
                          </tr>
                       </thead>
                       <tbody className="text-sm divide-y divide-white/5">
                          {state.tasks.map(task => (
                            <tr key={task.id} className="hover:bg-white/[0.02] transition-colors group">
                               <td className="p-6 text-white font-medium">{task.title}</td>
                               <td className="p-6">
                                  <div className="flex items-center gap-3">
                                     <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10">
                                        <img src={state.agents.find(a => a.id === task.assigneeId)?.avatar} className="w-full h-full" />
                                     </div>
                                     <span className="text-zinc-400">{state.agents.find(a => a.id === task.assigneeId)?.name}</span>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest
                                    ${task.status === 'DONE' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                     {task.status}
                                  </span>
                               </td>
                               <td className="p-6">
                                  <span className={`text-[9px] font-bold uppercase ${task.priority === 'HIGH' ? 'text-red-500' : 'text-zinc-600'}`}>
                                     {task.priority}
                                  </span>
                               </td>
                               <td className="p-6 text-zinc-500 font-mono text-[11px]">{task.dueDate}</td>
                               <td className="p-6">
                                  <div className="flex gap-2">
                                     {task.tags?.map(t => <span key={t} className="text-[8px] bg-white/5 px-2 py-1 rounded text-zinc-400 uppercase">{t}</span>)}
                                  </div>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>

                 {/* Mobile Card View */}
                 <div className="lg:hidden space-y-4">
                    {state.tasks.map(task => (
                       <div key={task.id} className="glass p-5 rounded-2xl border border-white/10 space-y-4">
                          <div className="flex justify-between items-start">
                             <h3 className="text-white font-bold text-sm leading-tight">{task.title}</h3>
                             <span className={`text-[8px] font-black uppercase tracking-widest ${task.priority === 'HIGH' ? 'text-red-500' : 'text-zinc-600'}`}>
                                {task.priority}
                             </span>
                          </div>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg overflow-hidden border border-white/5">
                                   <img src={state.agents.find(a => a.id === task.assigneeId)?.avatar} className="w-full h-full" />
                                </div>
                                <span className="text-[10px] text-zinc-400">{state.agents.find(a => a.id === task.assigneeId)?.name}</span>
                             </div>
                             <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest
                                ${task.status === 'DONE' ? 'bg-green-500/10 text-green-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                {task.status}
                             </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-white/5">
                             <span className="text-[9px] font-mono text-zinc-600">{task.dueDate}</span>
                             <div className="flex gap-1">
                                {task.tags?.slice(0, 2).map(t => <span key={t} className="text-[7px] bg-white/5 px-2 py-0.5 rounded text-zinc-500 uppercase">{t}</span>)}
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           )}

           {/* 3. ORG TREE */}
           {state.activeTab === 'OrgTree' && (
              <div className="max-w-6xl mx-auto h-full flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-1000">
                 <h2 className="text-white text-xl lg:text-3xl font-bold mb-10 lg:mb-20">Neural Organization Hierarchy</h2>
                 
                 {/* OPI - CEO */}
                 <div className="flex flex-col items-center gap-20">
                    <div className="flex flex-col items-center gap-4">
                       <div className="w-24 h-24 rounded-3xl glass border-2 border-blue-500/40 p-1 shadow-[0_0_50px_rgba(59,130,246,0.2)]">
                          <img src={state.agents.find(a => !a.parentId)?.avatar} className="w-full h-full rounded-2xl" />
                       </div>
                       <div className="text-center">
                          <div className="text-white font-black uppercase tracking-widest">{state.agents.find(a => !a.parentId)?.name}</div>
                          <div className="text-[9px] text-blue-500 font-bold uppercase">{state.agents.find(a => !a.parentId)?.role}</div>
                       </div>
                    </div>

                    <div className="flex gap-32 relative">
                       {/* Connection Lines (Simplified) */}
                       <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-px h-10 bg-white/10"></div>
                       <div className="absolute -top-10 left-[20%] right-[20%] h-px bg-white/10"></div>

                       {state.agents.filter(a => a.parentId === state.agents.find(x => !x.parentId)?.id).map(agent => (
                         <div key={agent.id} className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl glass border border-white/20 p-1">
                               <img src={agent.avatar} className="w-full h-full rounded-xl" />
                            </div>
                            <div className="text-center">
                               <div className="text-zinc-300 font-bold text-xs uppercase tracking-widest">{agent.name}</div>
                               <div className="text-[8px] text-zinc-600 font-bold uppercase">{agent.role}</div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           )}

           {/* 4. PHYSICAL OFFICE - REALISTIC ISOMETRIC HQ */}
           {state.activeTab === 'Physical' && (
             <PhysicalOffice 
                agents={state.agents} 
                selectedAgentId={state.selectedAgentId} 
                onSelectAgent={(id) => setState(s => ({ ...s, selectedAgentId: id }))} 
             />
           )}

           {/* 4.5 RESEARCH HUB */}
           {state.activeTab === 'Research' && (
             <ResearchHub 
               research={state.research}
               agents={state.agents}
             />
           )}

           {/* COMMAND CENTER */}
           {state.activeTab === 'CommandCenter' && (
             <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
               <CommandCenter />
             </div>
           )}

           {/* 4.6 SECURITY CENTER */}
           {state.activeTab === 'Security' && (
             <SecurityCenter 
               issues={state.securityIssues}
               agents={state.agents}
             />
           )}

           {/* 5. CRON MANAGER */}
           {state.activeTab === 'Cron' && (
              <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-10 duration-500">
                 <h2 className="text-white text-3xl font-bold mb-10">Automation Pulse (Cron)</h2>
                 <div className="grid grid-cols-1 gap-6">
                    {state.cronJobs.map(job => (
                      <div key={job.id} className="glass p-10 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                         <div className="flex gap-8 items-center">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border
                              ${job.lastRunStatus === 'RUNNING' ? 'bg-blue-600/20 border-blue-500/30' : 'bg-white/5 border-white/10'}`}>
                               <div className={`w-4 h-4 rounded-full ${job.lastRunStatus === 'RUNNING' ? 'bg-blue-500 animate-ping' : 'bg-green-500 shadow-[0_0_10px_#22c55e]'}`}></div>
                            </div>
                            <div>
                               <h3 className="text-white text-xl font-bold">{job.name}</h3>
                               <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{job.description}</p>
                            </div>
                         </div>
                         <div className="flex gap-12 text-right">
                            <div>
                               <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Interval</div>
                               <div className="text-sm text-zinc-300 font-mono">{job.interval || 3600}s</div>
                            </div>
                            <div>
                               <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mb-1">Next Run</div>
                               <div className="text-sm text-zinc-300 font-mono">{new Date(job.nextRun).toLocaleTimeString()}</div>
                            </div>
                            <button className="px-6 py-2 bg-white/5 rounded-xl text-[10px] font-bold text-white uppercase hover:bg-white/10 border border-white/5 transition-all">Manual Run</button>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           )}

           {/* FALLBACK TABS */}
            {state.activeTab === 'Artifacts' && (
               <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <h2 className="text-white text-3xl font-bold mb-10">Artifact Archive</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {state.artifacts.map(art => (
                        <div key={art.id} className="glass p-8 rounded-3xl border border-white/5 hover:border-blue-500/20 transition-all group">
                           <div className="flex justify-between items-start mb-6">
                              <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500">
                                 {art.type === 'CODE' ? '</>' : art.type === 'DOCUMENT' ? 'DOC' : art.type === 'IMAGE' ? 'IMG' : 'DATA'}
                              </div>
                              <span className="text-[9px] font-mono text-zinc-600">{new Date(art.timestamp).toLocaleDateString()}</span>
                           </div>
                           <h3 className="text-white font-bold text-lg mb-2">{art.title}</h3>
                           <div className="flex items-center gap-2 mb-4">
                              <div className="w-5 h-5 rounded-full overflow-hidden border border-white/10">
                                 <img src={state.agents.find(a => a.id === art.creatorId)?.avatar} className="w-full h-full" />
                              </div>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">{state.agents.find(a => a.id === art.creatorId)?.name}</span>
                           </div>
                           <div className="text-xs text-zinc-400 line-clamp-3 mb-6 bg-black/20 p-4 rounded-xl border border-white/5 font-mono">
                              {art.content}
                           </div>
                           <button className="w-full py-3 bg-white/5 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 border border-white/5 transition-all">View Full Content</button>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {state.activeTab === 'Memory' && (
               <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <h2 className="text-white text-3xl font-bold mb-10">Neural Memory Core</h2>
                  <div className="space-y-4">
                     {state.memories.map(mem => (
                        <div key={mem.id} className="glass p-6 rounded-2xl border border-white/5 flex gap-6 items-start">
                           <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                              <img src={state.agents.find(a => a.id === mem.agentId)?.avatar} className="w-full h-full" />
                           </div>
                           <div className="flex-1">
                              <div className="flex justify-between items-center mb-2">
                                 <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{state.agents.find(a => a.id === mem.agentId)?.name}</span>
                                 <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                       <div key={i} className={`w-1 h-1 rounded-full ${i < mem.importance ? 'bg-yellow-500' : 'bg-zinc-800'}`}></div>
                                    ))}
                                 </div>
                              </div>
                              <p className="text-zinc-300 text-sm leading-relaxed">{mem.content}</p>
                              <div className="mt-4 text-[9px] font-mono text-zinc-600">{new Date(mem.timestamp).toLocaleString()}</div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {state.activeTab === 'Logs' && (
               <div className="max-w-6xl mx-auto h-full flex flex-col animate-in fade-in duration-500">
                  <div className="flex justify-between items-center mb-6 lg:mb-8">
                     <h2 className="text-white text-xl lg:text-3xl font-bold">System Logs</h2>
                     <div className="flex gap-2 lg:gap-4">
                        <button className="px-3 lg:px-4 py-2 bg-white/5 rounded-lg text-[9px] lg:text-[10px] font-bold text-zinc-400 uppercase border border-white/5">Clear</button>
                        <button className="px-3 lg:px-4 py-2 bg-blue-600 rounded-lg text-[9px] lg:text-[10px] font-bold text-white uppercase">Export</button>
                     </div>
                  </div>
                  <div className="flex-1 glass rounded-2xl lg:rounded-3xl border border-white/10 overflow-hidden flex flex-col">
                     {/* Desktop Header */}
                     <div className="hidden lg:flex bg-white/5 px-8 py-4 border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                        <div className="w-32">Timestamp</div>
                        <div className="w-32">Agent</div>
                        <div className="w-24">Type</div>
                        <div className="flex-1">Message</div>
                     </div>
                     
                     <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-1 lg:space-y-1 font-mono text-[10px] lg:text-[11px] custom-scrollbar">
                        {state.logs.map(log => (
                           <div key={log.id} className="flex flex-col lg:flex-row px-3 py-3 lg:px-4 lg:py-2 bg-white/[0.02] lg:bg-transparent hover:bg-white/5 rounded-xl lg:rounded transition-colors group border-b border-white/5 lg:border-none gap-1 lg:gap-0">
                              <div className="flex justify-between lg:hidden mb-1">
                                 <div className="text-zinc-500 text-[9px]">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                 <div className={`font-bold text-[9px] ${log.type === 'ERROR' ? 'text-red-500' : log.type === 'WARNING' ? 'text-yellow-500' : log.type === 'SUCCESS' ? 'text-green-500' : 'text-blue-400'}`}>
                                    {log.type}
                                 </div>
                              </div>
                              
                              <div className="hidden lg:block w-32 text-zinc-600">{new Date(log.timestamp).toLocaleTimeString()}</div>
                              <div className="w-32 text-blue-500 font-bold flex items-center gap-2">
                                 <span className="lg:hidden text-zinc-600 font-normal">Source:</span>
                                 {state.agents.find(a => a.id === log.agentId)?.name || 'SYSTEM'}
                              </div>
                              <div className={`hidden lg:block w-24 font-bold ${log.type === 'ERROR' ? 'text-red-500' : log.type === 'WARNING' ? 'text-yellow-500' : log.type === 'SUCCESS' ? 'text-green-500' : 'text-blue-400'}`}>
                                 [{log.type}]
                              </div>
                              <div className="flex-1 text-zinc-300 group-hover:text-white transition-colors leading-relaxed">{log.message}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            )}

            {/* 9. CAPABILITIES & TOOLS HUB */}
            {state.activeTab === 'Capabilities' && (
               <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <div className="flex justify-between items-center mb-10">
                     <h2 className="text-white text-3xl font-bold">Capabilities & Tools Hub</h2>
                     <button className="px-4 py-2 bg-blue-600 rounded-lg text-[10px] font-bold text-white uppercase tracking-widest hover:bg-blue-500 transition-colors">
                        + Add Integration
                     </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {state.capabilities && state.capabilities.length > 0 ? state.capabilities.map((tool: any) => (
                        <div key={tool.id} className="glass p-8 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-6 opacity-10 text-6xl group-hover:scale-110 transition-transform">{tool.icon || '🔧'}</div>
                           <div className="flex justify-between items-start mb-6 relative z-10">
                              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl border border-white/10">
                                 {tool.icon || '🔧'}
                              </div>
                              <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${tool.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                                 {tool.status || 'Active'}
                              </span>
                           </div>
                           <h3 className="text-white font-bold text-xl mb-1 relative z-10">{tool.name}</h3>
                           <p className="text-zinc-500 text-xs font-mono mb-6 relative z-10">{tool.type}</p>
                           
                           <div className="space-y-4 relative z-10">
                              <div>
                                 <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2 font-bold">Authorized Agents</div>
                                 <div className="flex flex-wrap gap-2">
                                    {(tool.agents || []).map((agent: string) => (
                                       <span key={agent} className="px-2 py-1 bg-white/5 rounded text-[10px] text-zinc-300 border border-white/5">
                                          {agent}
                                       </span>
                                    ))}
                                 </div>
                              </div>
                              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                 <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Usage</span>
                                 <span className="text-xs text-blue-400 font-mono">{tool.usage || 'N/A'}</span>
                              </div>
                           </div>
                        </div>
                     )) : (
                        <div className="text-zinc-500">No capabilities found</div>
                     )}
                  </div>
               </div>
            )}

            {/* 10. MODELS FLEET */}
            {state.activeTab === 'Models' && (
               <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <div className="flex justify-between items-center mb-10">
                     <h2 className="text-white text-3xl font-bold">Models Fleet Monitor</h2>
                     <div className="flex gap-4">
                        <div className="px-4 py-2 bg-white/5 rounded-lg text-[10px] font-bold text-zinc-400 uppercase border border-white/5">
                           Total Cost Today: <span className="text-green-400 ml-1">{state.dailyCost.total}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {(state.models || []).map((model: any) => (
                        <div key={model.id} className="glass p-8 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-all group">
                           <div className="flex justify-between items-start mb-6">
                              <div>
                                 <h3 className="text-white font-bold text-2xl mb-1">{model.name}</h3>
                                 <p className="text-zinc-500 text-xs font-mono">{model.provider}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                 <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${model.status === 'Active' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                                    {model.status || 'Active'}
                                 </span>
                                 <span className="text-[10px] font-mono text-zinc-600">{model.latency || 'N/A'}</span>
                              </div>
                           </div>
                           
                           <p className="text-sm text-zinc-400 mb-8">{model.description || 'No description'}</p>
                           
                           <div className="grid grid-cols-2 gap-4 mb-6">
                              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                 <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">Tokens Used (24h)</div>
                                 <div className="text-lg font-mono text-white">{model.tokens_24h || 'N/A'}</div>
                              </div>
                              <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                 <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1 font-bold">Est. Cost (24h)</div>
                                 <div className="text-lg font-mono text-green-400">{model.cost_24h || '$0.00'}</div>
                              </div>
                           </div>
                           
                           <div>
                              <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-3 font-bold">Routed Agents</div>
                              <div className="flex flex-wrap gap-2">
                                 {(model.agents || []).map((agent: string) => (
                                    <span key={agent} className="px-3 py-1.5 bg-purple-500/10 rounded-lg text-[10px] text-purple-300 border border-purple-500/20 font-bold">
                                       {agent}
                                    </span>
                                 ))}
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* 11. INNOVATION & APPROVALS HUB */}
            {state.activeTab === 'Approvals' && (
               <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <div className="flex justify-between items-center mb-10">
                     <div>
                        <h2 className="text-white text-3xl font-bold mb-2">Innovation & Approvals</h2>
                        <p className="text-zinc-400 text-sm">Review and approve autonomous project proposals.</p>
                     </div>
                     <div className="flex gap-4">
                        <div className="px-4 py-2 bg-yellow-500/10 rounded-lg text-[10px] font-bold text-yellow-500 uppercase border border-yellow-500/20">
                        {(Array.isArray(state.proposals) ? state.proposals : []).filter(p => p.status === 'pending').length} Pending Approvals
                     </div>
                     </div>
                  </div>
                  
                  <div className="space-y-6">
                     {(Array.isArray(state.proposals) ? state.proposals : []).filter(p => p.status === 'pending').map(proposal => (
                        <div key={proposal.id} className="glass p-8 rounded-3xl border border-white/5 hover:border-yellow-500/30 transition-all group">
                           <div className="flex justify-between items-start mb-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 text-lg">
                                    💡
                                 </div>
                                 <div>
                                    <h3 className="text-white font-bold text-xl">{proposal.title}</h3>
                                    <div className="text-[10px] text-zinc-500 font-mono mt-1">Proposed by <span className="text-blue-400">{proposal.proposer}</span> • {proposal.date}</div>
                                 </div>
                              </div>
                              <div className="flex gap-2">
                                 <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border ${proposal.impact === 'Critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : proposal.impact === 'High' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                    Impact: {proposal.impact}
                                 </span>
                                 <span className="px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest border bg-zinc-500/10 text-zinc-400 border-zinc-500/20">
                                    Effort: {proposal.effort}
                                 </span>
                              </div>
                           </div>
                           
                           <p className="text-sm text-zinc-300 mb-6 leading-relaxed bg-black/20 p-5 rounded-2xl border border-white/5">
                              {proposal.description}
                           </p>
                           
                           <div className="flex justify-between items-end">
                              <div>
                                 <div className="text-[9px] text-zinc-600 uppercase tracking-widest mb-2 font-bold">Required Team</div>
                                 <div className="flex gap-2">
                                    {proposal.agents.map(agent => (
                                       <span key={agent} className="px-2 py-1 bg-white/5 rounded text-[10px] text-zinc-300 border border-white/5">
                                          {agent}
                                       </span>
                                    ))}
                                 </div>
                              </div>
                              <div className="flex gap-3">
                                 <button onClick={() => handleProposalAction(proposal.id, 'reject')} className="px-6 py-3 bg-white/5 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 rounded-xl text-[10px] font-bold text-zinc-400 uppercase tracking-widest border border-white/5 transition-all">
                                    Reject / Revise
                                 </button>
                                 <button onClick={() => handleProposalAction(proposal.id, 'approve')} className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] font-bold text-white uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all">
                                    Approve & Execute
                                 </button>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {/* 12. SYSTEM HEALTH */}
            {state.activeTab === 'SystemHealth' && (
               <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-5 duration-700">
                  <div className="flex justify-between items-center mb-10">
                     <div>
                        <h2 className="text-white text-3xl font-bold mb-2">System Health</h2>
                        <p className="text-zinc-400 text-sm">Real-time metrics and performance monitoring.</p>
                     </div>
                     <div className="flex gap-2">
                        <div className="px-3 py-1 bg-green-500/10 rounded-full text-[10px] font-bold text-green-500 uppercase border border-green-500/20 flex items-center gap-2">
                           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                           System Operational
                        </div>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                     {/* CPU & Memory Usage */}
                     <div className="glass p-6 rounded-3xl border border-white/5">
                        <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-6">Resource Usage</h3>
                        <div className="h-64 w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={Array.from({ length: 20 }, (_, i) => ({
                                 time: `${i}:00`,
                                 cpu: 40 + Math.random() * 30,
                                 memory: 60 + Math.random() * 20,
                              }))}>
                                 <defs>
                                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                       <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                    </linearGradient>
                                 </defs>
                                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                 <XAxis dataKey="time" stroke="#52525b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                 <YAxis stroke="#52525b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                 <Tooltip 
                                    contentStyle={{backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                                    itemStyle={{fontSize: '12px'}}
                                 />
                                 <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorCpu)" name="CPU Usage %" />
                                 <Area type="monotone" dataKey="memory" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorMem)" name="Memory Usage %" />
                              </AreaChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                     {/* Network Latency */}
                     <div className="glass p-6 rounded-3xl border border-white/5">
                        <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-6">Network Latency (ms)</h3>
                        <div className="h-64 w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={Array.from({ length: 20 }, (_, i) => ({
                                 time: `${i}:00`,
                                 latency: 20 + Math.random() * 50,
                              }))}>
                                 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                 <XAxis dataKey="time" stroke="#52525b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                 <YAxis stroke="#52525b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                 <Tooltip 
                                    contentStyle={{backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                                    itemStyle={{fontSize: '12px'}}
                                 />
                                 <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{r: 4, fill: '#10b981'}} name="Latency" />
                              </LineChart>
                           </ResponsiveContainer>
                        </div>
                     </div>
                  </div>

                  {/* API Response Times */}
                  <div className="glass p-6 rounded-3xl border border-white/5">
                     <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-6">API Response Times (ms)</h3>
                     <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={Array.from({ length: 24 }, (_, i) => ({
                              time: `${i}:00`,
                              api: 100 + Math.random() * 200,
                           }))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                              <XAxis dataKey="time" stroke="#52525b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                              <YAxis stroke="#52525b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                              <Tooltip 
                                 cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                 contentStyle={{backgroundColor: '#000', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}}
                                 itemStyle={{fontSize: '12px'}}
                              />
                              <Bar dataKey="api" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Response Time" />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
            )}

        </section>

        {/* AGENT INTERACTION OVERLAY (CRM PEAK) - Mobile Optimized */}
        <div className={`fixed lg:absolute bottom-0 inset-x-0 z-[100] transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1)
          ${state.selectedAgentId ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
          
          {/* Mobile Handle & Backdrop Blur */}
          <div className="lg:hidden absolute -top-10 inset-x-0 h-10 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
          <div className="lg:hidden w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>

          <div className="glass h-[92vh] lg:h-[550px] m-0 lg:m-10 rounded-t-[2rem] lg:rounded-[4rem] border border-white/20 shadow-[0_50px_100px_rgba(0,0,0,0.9)] flex flex-col lg:flex-row overflow-hidden bg-[#0a0a0c]">
             
             {/* LEFT: AGENT CRM INFO */}
             <div className="w-full lg:w-[400px] border-b lg:border-b-0 lg:border-l border-white/10 p-6 lg:p-16 bg-black/40 flex flex-row lg:flex-col items-center lg:text-center gap-4 lg:gap-0 shrink-0">
                {state.selectedAgentId && (() => {
                  const a = state.agents.find(x => x.id === state.selectedAgentId)!;
                  return (
                    <div className="contents lg:block animate-in fade-in slide-in-from-right-10 duration-700 w-full">
                       <div className="relative shrink-0">
                          <div className="w-16 h-16 lg:w-32 lg:h-32 rounded-2xl lg:rounded-[2.5rem] border-2 border-white/20 p-1 lg:p-2 shadow-2xl mx-auto">
                             <img src={a.avatar} className="w-full h-full rounded-xl lg:rounded-2xl object-cover" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 lg:-bottom-2 lg:-right-2 bg-green-500 w-5 h-5 lg:w-8 lg:h-8 rounded-full border-2 lg:border-4 border-black flex items-center justify-center text-[7px] lg:text-[10px] font-black text-black">
                             99
                          </div>
                       </div>
                       <div className="flex-1 lg:flex-none min-w-0 lg:mt-8">
                          <h3 className="text-white text-lg lg:text-3xl font-bold tracking-tight uppercase truncate">{a.name}</h3>
                          <div className="text-[8px] lg:text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mt-0.5 lg:mt-2 truncate">{a.role}</div>
                          <p className="hidden lg:block text-sm text-zinc-500 leading-relaxed italic mt-4">"{a.description}"</p>
                          <div className="hidden lg:flex flex-wrap justify-center gap-2 mt-6">
                             {a.expertise.slice(0, 3).map(exp => <span key={exp} className="text-[8px] border border-white/10 px-3 py-1.5 rounded-full text-zinc-400 uppercase tracking-widest">{exp}</span>)}
                          </div>
                       </div>
                       
                       {/* Mobile Actions */}
                       <div className="lg:hidden flex flex-col gap-2">
                          <button onClick={() => setState(s => ({ ...s, selectedAgentId: null }))} 
                             className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-zinc-400">
                             ✕
                          </button>
                       </div>

                       {/* Desktop Actions */}
                       <div className="hidden lg:flex gap-3 mt-8 w-full">
                          <button onClick={() => setState(s => ({ ...s, selectedAgentId: null }))}
                            className="flex-1 py-5 rounded-2xl bg-white/5 text-[10px] font-bold text-zinc-500 uppercase tracking-[0.3em] hover:bg-white/10 transition-all border border-white/5 active:scale-95">
                            Close
                          </button>
                          <button onClick={() => { setPromptText(a.systemPrompt); setIsEditingPrompt(true); }}
                            className="flex-1 py-5 rounded-2xl bg-blue-600/10 text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em] hover:bg-blue-600/20 transition-all border border-blue-500/20 active:scale-95">
                            Configure
                          </button>
                       </div>
                    </div>
                  );
                })()}
             </div>

             {/* RIGHT: CHAT LOG & INPUT OR PROMPT EDITOR */}
             <div className="flex-1 p-4 lg:p-16 flex flex-col bg-gradient-to-br from-[#0a0a0c] to-black overflow-hidden relative h-full">
                {isEditingPrompt ? (
                   <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-300">
                      <div className="flex justify-between items-center mb-4 lg:mb-6">
                         <h3 className="text-white text-lg lg:text-xl font-bold uppercase tracking-widest">System Prompt</h3>
                         <button onClick={() => setIsEditingPrompt(false)} className="text-zinc-500 hover:text-white transition-colors text-xs lg:text-sm">
                            Cancel
                         </button>
                      </div>
                      <textarea 
                         value={promptText}
                         onChange={e => setPromptText(e.target.value)}
                         className="flex-1 bg-black/40 border border-white/10 rounded-xl lg:rounded-2xl p-4 lg:p-6 text-xs lg:text-sm font-mono text-zinc-300 focus:border-blue-500/50 outline-none resize-none mb-4 lg:mb-6 custom-scrollbar leading-relaxed"
                         placeholder="Enter system prompt here..."
                      />
                      <div className="flex justify-end">
                         <button onClick={handleSavePrompt} className="px-6 lg:px-8 py-3 lg:py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-[10px] lg:text-xs font-bold text-white uppercase tracking-widest shadow-2xl transition-all active:scale-95">
                            Save Config
                         </button>
                      </div>
                   </div>
                ) : (
                   <>
                      <div className="flex-1 overflow-hidden relative mb-3 lg:mb-0">
                         <OfficeLog messages={state.messages.filter(m => m.senderId === 'user' || m.senderId === state.selectedAgentId)} />
                         <div className="absolute inset-x-0 bottom-0 h-8 lg:h-20 bg-gradient-to-t from-[#0a0a0c] to-transparent pointer-events-none"></div>
                      </div>
                      <div className="flex gap-2 lg:gap-6 mt-auto shrink-0">
                         <input 
                           type="text" value={inputText} 
                           onChange={e => setInputText(e.target.value)} 
                           onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputText, state.selectedAgentId!)}
                           placeholder={`Command ${state.agents.find(a => a.id === state.selectedAgentId)?.name}...`}
                           className="flex-1 bg-black/60 border border-white/10 rounded-xl lg:rounded-[1.5rem] px-4 lg:px-10 py-3 lg:py-5 text-xs lg:text-sm text-white focus:border-blue-500/50 outline-none transition-all" />
                         <button onClick={() => handleSendMessage(inputText, state.selectedAgentId!)} disabled={isTyping}
                           className="bg-blue-600 hover:bg-blue-500 px-4 lg:px-12 rounded-xl lg:rounded-[1.5rem] text-[9px] lg:text-[11px] font-bold text-white uppercase tracking-widest shadow-2xl transition-all active:scale-95 whitespace-nowrap">
                           {isTyping ? '...' : 'Send'}
                         </button>
                      </div>
                      {/* Mobile Config Button (Only visible when not editing) */}
                      <div className="lg:hidden mt-3 flex justify-center">
                         <button onClick={() => { 
                            const a = state.agents.find(x => x.id === state.selectedAgentId);
                            if(a) { setPromptText(a.systemPrompt); setIsEditingPrompt(true); }
                         }} className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold flex items-center gap-1">
                            <span>⚙️ Configure Agent</span>
                         </button>
                      </div>
                   </>
                )}
             </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
