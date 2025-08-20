// src/pages/TasksPage/TasksPage.js
import React from 'react';
import TaskList from '../../components/TaskList/TaskList';
import './TasksPage.css';

function TasksPage() {
  return (
    <div className="admin-page tasks-page">
      <div className="page-content">
        <div className="tasks-list-container">
          <TaskList />
        </div>
      </div>
    </div>
  );
}

export default TasksPage;
