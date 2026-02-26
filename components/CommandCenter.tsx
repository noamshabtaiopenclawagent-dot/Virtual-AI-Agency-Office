/**
 * Command Center Widget - V2.1
 * Direct command interface to spawn and control agents
 */

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, Bot, Loader2, CheckCircle, XCircle } from 'lucide-react';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://ojejyiftczrvzcyioiff.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZWp5aWZ0Y3pydnpjeWlvaWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDkxODAsImV4cCI6MjA4NjkyNTE4MH0.Vp2fkvEXVNGAk8FvFabEKKAaI87qhIwhLfHS1UbfL5I'
);

// Predefined command templates
const COMMAND_TEMPLATES = [
  { 
    id: 1, 
    label: 'Analyze Stock', 
    command: 'analyze {ticker}', 
    agent: 'Finance',
    icon: '📊',
    placeholder: 'e.g., AAPL, TSLA, NVDA'
  },
  { 
    id: 2, 
    label: 'Research Topic', 
    command: 'research {topic}', 
    agent: 'Mona',
    icon: '🔍',
    placeholder: 'e.g., AI trends, quantum computing'
  },
  { 
    id: 3, 
    label: 'Build Component', 
    command: 'build {component}', 
    agent: 'Dev',
    icon: '⚡',
    placeholder: 'e.g., dashboard, chart, button'
  },
  { 
    id: 4, 
    label: 'Security Audit', 
    command: 'security audit', 
    agent: 'Sage',
    icon: '🛡️',
    placeholder: 'Full system scan'
  },
  { 
    id: 5, 
    label: 'Write Note', 
    command: 'note {content}', 
    agent: 'Content',
    icon: '📝',
    placeholder: 'Meeting notes, summary...'
  },
  { 
    id: 6, 
    label: 'Schedule Task', 
    command: 'schedule {task}', 
    agent: 'Admin',
    icon: '📅',
    placeholder: 'Task description...'
  },
];

export default function CommandCenter() {
  const [input, setInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [agents, setAgents] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null

  // Fetch available agents
  useEffect(() => {
    async function fetchAgents() {
      const { data } = await supabase
        .from('agents')
        .select('id, name, role, status, avatar')
        .order('name');
      setAgents(data || []);
    }
    fetchAgents();
  }, []);

  // Handle template selection
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setInput(template.command);
    setStatus(null);
  };

  // Execute command
  const executeCommand = async () => {
    if (!input.trim()) return;
    
    setLoading(true);
    setStatus(null);
    
    try {
      // 1. Log to agent_commands table
      const { data: cmdData, error: cmdError } = await supabase
        .from('agent_commands')
        .insert({
          command: input,
          status: 'queued',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (cmdError) {
        console.warn('agent_commands table not ready, using local mode');
      }

      // 2. Add to local history
      const newEntry = {
        id: Date.now(),
        command: input,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      setHistory(prev => [newEntry, ...prev.slice(0, 9)]);
      
      // 3. Simulate agent response (in V2.2, this will be real)
      setTimeout(() => {
        setHistory(prev => 
          prev.map(h => 
            h.id === newEntry.id 
              ? { ...h, status: 'completed', response: 'Command received. Processing...' }
              : h
          )
        );
        setLoading(false);
        setStatus('success');
        setInput('');
        setSelectedTemplate(null);
      }, 1500);

    } catch (error) {
      console.error('Command failed:', error);
      setLoading(false);
      setStatus('error');
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand();
    }
  };

  return (
    <div className="command-center">
      {/* Header */}
      <div className="cc-header">
        <Bot className="cc-icon" />
        <h3>Command Center</h3>
        <span className="cc-status">
          {agents.filter(a => a.status !== 'IDLE').length} Active Agents
        </span>
      </div>

      {/* Quick Command Templates */}
      <div className="cc-templates">
        {COMMAND_TEMPLATES.map(template => (
          <button
            key={template.id}
            className={`cc-template ${selectedTemplate?.id === template.id ? 'active' : ''}`}
            onClick={() => handleTemplateSelect(template)}
            title={template.placeholder}
          >
            <span className="cc-template-icon">{template.icon}</span>
            <span className="cc-template-label">{template.label}</span>
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="cc-input-area">
        <input
          type="text"
          className="cc-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTemplate?.placeholder || 'Type command or select template...'}
          disabled={loading}
        />
        <button 
          className="cc-submit"
          onClick={executeCommand}
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <Loader2 className="cc-spinner" />
          ) : (
            <Send size={18} />
          )}
        </button>
      </div>

      {/* Status Indicator */}
      {status && (
        <div className={`cc-status-bar ${status}`}>
          {status === 'success' ? (
            <><CheckCircle size={14} /> Command sent</>
          ) : (
            <><XCircle size={14} /> Failed</>
          )}
        </div>
      )}

      {/* Command History */}
      {history.length > 0 && (
        <div className="cc-history">
          <h4>Recent Commands</h4>
          {history.map(entry => (
            <div key={entry.id} className={`cc-history-item ${entry.status}`}>
              <span className="cc-history-cmd">$ {entry.command}</span>
              <span className="cc-history-time">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Active Agents */}
      <div className="cc-agents">
        <h4>Available Agents</h4>
        <div className="cc-agent-grid">
          {agents.map(agent => (
            <div key={agent.id} className={`cc-agent ${agent.status.toLowerCase()}`}>
              <img src={agent.avatar} alt={agent.name} className="cc-agent-avatar" />
              <span className="cc-agent-name">{agent.name}</span>
              <span className="cc-agent-role">{agent.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
