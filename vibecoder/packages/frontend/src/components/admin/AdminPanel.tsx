import { useEffect, useState } from 'react';
import type { User } from '@vibecoder/shared';
import { adminApi } from '../../lib/api';
import './AdminPanel.css';

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // New user form
  const [showForm, setShowForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  // Reset password
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { users } = await adminApi.listUsers();
      setUsers(users);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // Auto-clear success messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;
    try {
      setError(null);
      await adminApi.createUser(newUsername.trim(), newPassword, newRole);
      setSuccess(`User "${newUsername.trim()}" created`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setShowForm(false);
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      setError(null);
      await adminApi.deleteUser(user.id);
      setSuccess(`User "${user.username}" deleted`);
      await loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUserId || !resetPassword) return;
    try {
      setError(null);
      await adminApi.resetPassword(resetUserId, resetPassword);
      const user = users.find((u) => u.id === resetUserId);
      setSuccess(`Password reset for "${user?.username}"`);
      setResetUserId(null);
      setResetPassword('');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="admin">
      <div className="admin__header">
        <h2 className="admin__title">Admin Panel</h2>
        <button className="admin__btn admin__btn--primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : '+ Add User'}
        </button>
      </div>

      {/* Status messages */}
      {error && (
        <div className="admin__alert admin__alert--error">
          {error}
          <button className="admin__alert-dismiss" onClick={() => setError(null)}>x</button>
        </div>
      )}
      {success && (
        <div className="admin__alert admin__alert--success">
          {success}
        </div>
      )}

      {/* Create user form */}
      {showForm && (
        <form className="admin__form" onSubmit={handleCreateUser}>
          <div className="admin__form-row">
            <input
              className="admin__input"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              autoFocus
            />
            <input
              className="admin__input"
              type="password"
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <select
              className="admin__select"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className="admin__btn admin__btn--primary"
              type="submit"
              disabled={!newUsername.trim() || !newPassword}
            >
              Create
            </button>
          </div>
        </form>
      )}

      {/* User list */}
      {loading ? (
        <div className="admin__loading">Loading users...</div>
      ) : (
        <div className="admin__table-wrap">
          <table className="admin__table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <span className="admin__username">{user.username}</span>
                  </td>
                  <td>
                    <span className={`admin__role admin__role--${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="admin__date">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="admin__actions">
                      {resetUserId === user.id ? (
                        <form className="admin__reset-form" onSubmit={handleResetPassword}>
                          <input
                            className="admin__input admin__input--small"
                            type="password"
                            placeholder="New password"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                            autoFocus
                          />
                          <button
                            className="admin__btn admin__btn--small admin__btn--primary"
                            type="submit"
                            disabled={!resetPassword}
                          >
                            Save
                          </button>
                          <button
                            className="admin__btn admin__btn--small"
                            type="button"
                            onClick={() => { setResetUserId(null); setResetPassword(''); }}
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <button
                            className="admin__btn admin__btn--small"
                            onClick={() => setResetUserId(user.id)}
                          >
                            Reset Password
                          </button>
                          <button
                            className="admin__btn admin__btn--small admin__btn--danger"
                            onClick={() => handleDeleteUser(user)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
