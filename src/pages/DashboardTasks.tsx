import React, { useEffect, useState } from 'react';

interface Task {
  resourceId: string;
  type: string;
  title?: string;
  status: string;
  checkDate?: string;
  caseId: string;
  idwf: string;
  model_name?: string;
  time_elapsed?: string;
  locked_by?: number | null;
  locked: boolean;
  locked_by_nick?: string;
}

interface TaskCounts {
  pending: number;
  validating: number;
}

const DashboardTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [counts, setCounts] = useState<TaskCounts>({ pending: 0, validating: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        // Fetch counts and tasks in parallel
        const [countsRes, tasksRes] = await Promise.all([
          fetch('/dashboard/tasks/count', { 
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/dashboard/tasks?status=user&locked_by=NULL', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        if (!countsRes.ok || !tasksRes.ok) throw new Error('Failed to fetch tasks');
        
        const countsData = await countsRes.json();
        const tasksData = await tasksRes.json();
        
        setCounts(countsData);
        setTasks(tasksData.tasks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="dashboard-tasks">
      <h1>Dashboard Tasks</h1>
      
      <div className="task-summary">
        <div className="summary-card pending">
          <h2>Pending</h2>
          <p>{counts.pending}</p>
        </div>
        <div className="summary-card validating">
          <h2>In Progress / Validating</h2>
          <p>{counts.validating}</p>
        </div>
      </div>

      <table className="tasks-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Time Elapsed</th>
            <th>Model</th>
            <th>Case ID</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.resourceId}>
              <td>{task.title || task.type}</td>
              <td>{task.status}</td>
              <td>{task.time_elapsed}</td>
              <td>{task.model_name}</td>
              <td>{task.caseId}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {tasks.length === 0 && (
        <div className="no-tasks">No tasks found</div>
      )}
    </div>
  );
};

export default DashboardTasks;