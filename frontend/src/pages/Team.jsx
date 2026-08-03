import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useToast } from '../hooks/useToast.jsx';
import api from '../services/api';
import Input from '../components/ui/Input.jsx';
import Drawer from '../components/common/Drawer.jsx';
import { User, Shield, Key, FileText, CheckCircle2, ShieldAlert, Edit2, Trash2, Plus, Users, Search } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/common/Table.jsx';

export default function Team() {
  const { user } = useAuth();
  const toast = useToast();

  // Redirect if not ADMIN
  if (user?.role !== 'ADMIN') {
    return <Navigate to="/bookings" replace />;
  }

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Modals forms states
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'TEAM_MEMBER',
    permissions: {
      canEditLeads: true,
      canEditMobileNumber: false,
      canDownloadInvoice: true,
      canCreateLeads: true,
      canDeleteLeads: false
    }
  });

  const [editForm, setEditForm] = useState({
    userId: '',
    name: '',
    role: 'TEAM_MEMBER',
    password: '',
    permissions: {
      canEditLeads: true,
      canEditMobileNumber: false,
      canDownloadInvoice: true,
      canCreateLeads: true,
      canDeleteLeads: false
    }
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = () => {
    setLoading(true);
    api.get('/users')
      .then((res) => {
        setMembers(res.data.users || []);
      })
      .catch(() => {
        toast.error('Could not load team members.');
      })
      .finally(() => setLoading(false));
  };

  const handleAddPermissionChange = (key) => {
    setAddForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleEditPermissionChange = (key) => {
    setEditForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const validateAddForm = () => {
    const errors = {};
    if (!addForm.name.trim()) errors.name = 'Name is required.';
    if (!addForm.email.trim()) {
      errors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(addForm.email)) {
      errors.email = 'Invalid email format.';
    }
    if (!addForm.password) {
      errors.password = 'Password is required.';
    } else if (addForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editForm.name.trim()) errors.name = 'Name is required.';
    if (editForm.password && editForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateAddForm()) return;

    try {
      await api.post('/users', addForm);
      toast.success('Team member created successfully.');
      setShowAddModal(false);
      // Reset form
      setAddForm({
        name: '',
        email: '',
        password: '',
        role: 'TEAM_MEMBER',
        permissions: {
          canEditLeads: true,
          canEditMobileNumber: false,
          canDownloadInvoice: true,
          canCreateLeads: true,
          canDeleteLeads: false
        }
      });
      setFormErrors({});
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create team member.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    try {
      const payload = {
        name: editForm.name,
        role: editForm.role,
        permissions: editForm.permissions
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await api.put(`/users/${editForm.userId}`, payload);
      toast.success('Team member updated successfully.');
      setShowEditModal(false);
      setFormErrors({});
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update team member.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return;
    try {
      await api.delete(`/users/${id}`);
      toast.success('Team member deleted.');
      fetchMembers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete team member.');
    }
  };

  const openEditModal = (member) => {
    // Merge member permissions default values
    const defaultPerms = {
      canEditLeads: true,
      canEditMobileNumber: false,
      canDownloadInvoice: true,
      canCreateLeads: true,
      canDeleteLeads: false
    };

    setEditForm({
      userId: member.userId,
      name: member.name,
      role: member.role || 'TEAM_MEMBER',
      password: '',
      permissions: {
        ...defaultPerms,
        ...(member.permissions || {})
      }
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Team Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your travel agency staff accounts, roles, and CRUD permission privileges.
          </p>
        </div>
        <button
          onClick={() => {
            setFormErrors({});
            setShowAddModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold shadow-md shadow-brand-500/10 transition text-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Member
        </button>
      </div>

      {/* Team Table Grid */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent mb-4"></div>
            <p className="text-sm">Loading staff directory…</p>
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <User size={24} className="text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No staff members found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">
              Click the "Add Member" button to configure logins for your team.
            </p>
          </div>
        ) : (
          <Table>
            <Thead>
              <Th>Name & Email</Th>
              <Th>Role</Th>
              <Th>Performance</Th>
              <Th>Access Rights</Th>
              <Th className="text-right">Actions</Th>
            </Thead>
            <Tbody>
                {members.map((member) => {
                  const isSelf = member.userId === user.userId;
                  const perms = member.permissions || {};
                  
                  return (
                    <Tr key={member.userId}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 flex items-center justify-center font-bold text-sm">
                            {member.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                              {member.name}
                              {isSelf && (
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-zinc-400 rounded-md">
                                  YOU
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">{member.email}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          member.role === 'ADMIN'
                            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                        }`}>
                          {member.role === 'ADMIN' ? <Shield size={12} /> : <User size={12} />}
                          {member.role}
                        </span>
                      </Td>
                      <Td>
                        <div className="flex gap-4">
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-base font-extrabold text-slate-700">{member.totalLeads || 0}</span>
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Assigned</span>
                          </div>
                          <div className="w-px h-8 bg-slate-200 mt-1"></div>
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-base font-extrabold text-emerald-600">{member.wonLeads || 0}</span>
                            <span className="text-[9px] uppercase font-bold text-emerald-500/80 tracking-wider">Booked</span>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        {member.role === 'ADMIN' ? (
                          <span className="text-xs font-medium text-slate-400">Full Administrative Access</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                              perms.canCreateLeads !== false ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-50 text-slate-400 line-through'
                            }`}>
                              Create Leads
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                              perms.canEditLeads !== false ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-50 text-slate-400 line-through'
                            }`}>
                              Edit Details
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                              perms.canEditMobileNumber ? 'bg-brand-50 text-brand-700 border border-brand-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {perms.canEditMobileNumber ? '✓ Mobile Edit' : '✕ Mobile Lock'}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                              perms.canDownloadInvoice !== false ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-50 text-slate-400 line-through'
                            }`}>
                              Download Invoices
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                              perms.canDeleteLeads ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-50 text-slate-400 line-through'
                            }`}>
                              Delete Leads
                            </span>
                          </div>
                        )}
                      </Td>
                      <Td className="text-right">
                        {!isSelf && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition"
                              title="Edit Permissions"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(member.userId)}
                              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50/50 transition"
                              title="Delete Member"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
        )}
      </div>

      {/* Add Drawer */}
      <Drawer open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Team Member">
        <form onSubmit={handleAddSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Input
                    label="Staff Name"
                    placeholder="e.g. Amit Sharma"
                    value={addForm.name}
                    error={formErrors.name}
                    onChange={(e) => {
                      setAddForm({ ...addForm, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                    }}
                    required
                  />
                  <p className="text-[10px] text-slate-400">Full name of the team member</p>
                </div>

                <div className="space-y-1">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="e.g. amit@yourcompany.com"
                    value={addForm.email}
                    error={formErrors.email}
                    onChange={(e) => {
                      setAddForm({ ...addForm, email: e.target.value });
                      if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
                    }}
                    required
                  />
                  <p className="text-[10px] text-slate-400">This will be used for login credentials</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-1">
                  <Input
                    label="Login Password"
                    type="password"
                    placeholder="Min 6 characters, e.g. Abc@1234"
                    value={addForm.password}
                    error={formErrors.password}
                    onChange={(e) => {
                      setAddForm({ ...addForm, password: e.target.value });
                      if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                    }}
                    required
                  />
                  <p className="text-[10px] text-slate-400">Secure password for dashboard access</p>
                </div>

                {/* Role selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, role: 'TEAM_MEMBER' })}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-semibold transition ${
                        addForm.role === 'TEAM_MEMBER'
                          ? 'border-brand-500 bg-brand-50/20 text-brand-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <User size={16} />
                      Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddForm({ ...addForm, role: 'ADMIN' })}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-semibold transition ${
                        addForm.role === 'ADMIN'
                          ? 'border-brand-500 bg-brand-50/20 text-brand-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Shield size={16} />
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Permissions settings for TEAM_MEMBER */}
              {addForm.role === 'TEAM_MEMBER' && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Configurable Access Permissions
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'canCreateLeads', label: 'Allow Creating Leads' },
                      { key: 'canEditLeads', label: 'Allow Editing Lead Details' },
                      { key: 'canEditMobileNumber', label: 'Allow Editing Mobile Numbers', warning: true },
                      { key: 'canDownloadInvoice', label: 'Allow Downloading & Emailing Invoices' },
                      { key: 'canDeleteLeads', label: 'Allow Deleting Leads' }
                    ].map((perm) => (
                      <label key={perm.key} className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition border border-slate-100/50 bg-slate-50/20">
                        <input
                          type="checkbox"
                          checked={addForm.permissions[perm.key]}
                          onChange={() => handleAddPermissionChange(perm.key)}
                          className="mt-0.5 rounded text-brand-600 focus:ring-brand-500/20 border-slate-300 w-4 h-4"
                        />
                        <div className="text-sm">
                          <div className={`font-semibold ${perm.warning ? 'text-slate-800 flex items-center gap-1.5' : 'text-slate-700'}`}>
                            {perm.label}
                            {perm.warning && !addForm.permissions[perm.key] && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-[10px] font-bold text-rose-600 rounded">
                                SECURED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {perm.key === 'canEditMobileNumber' 
                              ? 'Locks editing of phone fields in forms.'
                              : `Grants access to execute operations.`
                            }
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Drawer controls */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Save Member
                </button>
              </div>
            </form>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Team Member Permissions">
        <form onSubmit={handleEditSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Input
                    label="Staff Name"
                    placeholder="e.g. Amit Sharma"
                    value={editForm.name}
                    error={formErrors.name}
                    onChange={(e) => {
                      setEditForm({ ...editForm, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                    }}
                    required
                  />
                  <p className="text-[10px] text-slate-400">Full name of the team member</p>
                </div>

                <div className="space-y-1">
                  <Input
                    label="Reset Login Password"
                    type="password"
                    placeholder="Leave blank to keep existing"
                    value={editForm.password}
                    error={formErrors.password}
                    onChange={(e) => {
                      setEditForm({ ...editForm, password: e.target.value });
                      if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
                    }}
                  />
                  <p className="text-[10px] text-slate-400">Optional — only fill to change password</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                {/* Role selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, role: 'TEAM_MEMBER' })}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-semibold transition ${
                        editForm.role === 'TEAM_MEMBER'
                          ? 'border-brand-500 bg-brand-50/20 text-brand-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <User size={16} />
                      Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, role: 'ADMIN' })}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-semibold transition ${
                        editForm.role === 'ADMIN'
                          ? 'border-brand-500 bg-brand-50/20 text-brand-700'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      <Shield size={16} />
                      Admin
                    </button>
                  </div>
                </div>
              </div>

              {/* Permissions settings for TEAM_MEMBER */}
              {editForm.role === 'TEAM_MEMBER' && (
                <div className="border-t border-slate-100 pt-4 mt-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                    Configurable Access Permissions
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'canCreateLeads', label: 'Allow Creating Leads' },
                      { key: 'canEditLeads', label: 'Allow Editing Lead Details' },
                      { key: 'canEditMobileNumber', label: 'Allow Editing Mobile Numbers', warning: true },
                      { key: 'canDownloadInvoice', label: 'Allow Downloading & Emailing Invoices' },
                      { key: 'canDeleteLeads', label: 'Allow Deleting Leads' }
                    ].map((perm) => (
                      <label key={perm.key} className="flex items-start gap-3 cursor-pointer p-2 hover:bg-slate-100 rounded-lg transition border border-slate-100/50 bg-slate-50/20">
                        <input
                          type="checkbox"
                          checked={editForm.permissions[perm.key] !== false}
                          onChange={() => handleEditPermissionChange(perm.key)}
                          className="mt-0.5 rounded text-brand-600 focus:ring-brand-500/20 border-slate-300 w-4 h-4"
                        />
                        <div className="text-sm">
                          <div className={`font-semibold ${perm.warning ? 'text-slate-800 flex items-center gap-1.5' : 'text-slate-700'}`}>
                            {perm.label}
                            {!editForm.permissions[perm.key] && perm.warning && (
                              <span className="px-1.5 py-0.5 bg-rose-50 text-[10px] font-bold text-rose-600 rounded">
                                SECURED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {perm.key === 'canEditMobileNumber' 
                              ? 'Locks editing of phone fields in forms.'
                              : `Grants access to execute operations.`
                            }
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Drawer controls */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Update Member
                </button>
              </div>
            </form>
      </Drawer>
    </div>
  );
}
