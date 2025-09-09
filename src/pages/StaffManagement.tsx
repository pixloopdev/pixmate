import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { supabase, Profile } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Mail, Calendar, Shield, Search, Plus, X, AlertCircle, CheckCircle } from 'lucide-react';

const StaffManagement: React.FC = () => {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [assignedCampaigns, setAssignedCampaigns] = useState<any[]>([]);
  const [showDeleteStaffModal, setShowDeleteStaffModal] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<Profile | null>(null);
  const [showEditStaffModal, setShowEditStaffModal] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<Profile | null>(null);
  const [editStaffForm, setEditStaffForm] = useState({
    full_name: '',
    email: '',
  });
  const [newStaff, setNewStaff] = useState({
    email: '',
    password: '',
    full_name: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (profile?.role === 'superadmin') {
      fetchStaff();
      fetchCampaigns();
    }
  }, [profile?.role]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError('');

      // First, let's try to get all profiles without any filtering
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('All profiles:', allProfiles);
      console.log('All profiles error:', allError);
      
      if (allError) {
        console.error('Error fetching profiles:', allError);
        setError(`Error fetching profiles: ${allError.message}`);
        setStaff([]);
      } else {
        // Filter for staff members
        const staffMembers = (allProfiles || []).filter(member => member.role === 'staff');
        console.log('Staff members found:', staffMembers);
        setStaff(staffMembers);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setError(`Unexpected error: ${error}`);
      setStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching campaigns:', error);
      } else {
        setCampaigns(data || []);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const fetchStaffCampaigns = async (staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_assignments')
        .select(`
          *,
          campaigns(*)
        `)
        .eq('staff_id', staffId);

      if (error) {
        console.error('Error fetching staff campaigns:', error);
      } else {
        setAssignedCampaigns(data || []);
      }
    } catch (error) {
      console.error('Error fetching staff campaigns:', error);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Create user account without auto-login
      const { error: authError } = await supabase.auth.admin.createUser({
        email: newStaff.email,
        password: newStaff.password,
        user_metadata: {
          full_name: newStaff.full_name,
          role: 'staff',
        },
        email_confirm: true
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      setSuccess('Staff member added successfully!');
      setNewStaff({ email: '', password: '', full_name: '' });
      setTimeout(() => {
        setShowAddModal(false);
        setSuccess('');
        fetchStaff();
      }, 2000);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleAssignCampaign = async (campaignId: string) => {
    if (!selectedStaff) return;

    try {
      const { error } = await supabase.from('campaign_assignments').insert([
        {
          campaign_id: campaignId,
          staff_id: selectedStaff.id,
          assigned_by: profile?.id,
        },
      ]);

      if (error) {
        console.error('Error assigning campaign:', error);
        setError('Failed to assign campaign');
      } else {
        setSuccess('Campaign assigned successfully!');
        fetchStaffCampaigns(selectedStaff.id);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleUnassignCampaign = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) {
        console.error('Error unassigning campaign:', error);
        setError('Failed to unassign campaign');
      } else {
        setSuccess('Campaign unassigned successfully!');
        if (selectedStaff) {
          fetchStaffCampaigns(selectedStaff.id);
        }
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };

  const openAssignModal = (staff: Profile) => {
    setSelectedStaff(staff);
    setShowAssignModal(true);
    fetchStaffCampaigns(staff.id);
  };

  const handleRemoveStaff = (staff: Profile) => {
    setStaffToDelete(staff);
    setShowDeleteStaffModal(true);
  };

  const handleEditStaff = (staff: Profile) => {
    setStaffToEdit(staff);
    setEditStaffForm({
      full_name: staff.full_name || '',
      email: staff.email,
    });
    setShowEditStaffModal(true);
  };

  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffToEdit) return;

    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editStaffForm.full_name || null,
          email: editStaffForm.email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', staffToEdit.id);

      if (error) {
        setError(`Error updating staff: ${error.message}`);
      } else {
        setSuccess('Staff member updated successfully!');
        setShowEditStaffModal(false);
        setStaffToEdit(null);
        fetchStaff();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      setError(`Error updating staff: ${error.message}`);
    }
  };

  const confirmRemoveStaff = async () => {
    if (!staffToDelete) return;

    try {
      // First, remove all campaign assignments for this staff member
      const { error: assignmentError } = await supabase
        .from('campaign_assignments')
        .delete()
        .eq('staff_id', staffToDelete.id);

      if (assignmentError) {
        console.error('Error removing campaign assignments:', assignmentError);
        setError('Failed to remove staff assignments');
        return;
      }

      // Then, delete the staff profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', staffToDelete.id);

      if (profileError) {
        console.error('Error removing staff profile:', profileError);
        setError('Failed to remove staff member');
        return;
      }

      setSuccess('Staff member removed successfully!');
      setShowDeleteStaffModal(false);
      setStaffToDelete(null);
      fetchStaff();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error removing staff:', error);
      setError(`Error removing staff: ${error.message}`);
    }
  };

  const filteredStaff = staff.filter(member =>
    (member.full_name && member.full_name.trim() !== '' ? member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) : false) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (profile?.role !== 'superadmin') {
    return (
      <Layout>
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You don't have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Management</h1>
            <p className="text-gray-600 mt-2">Manage your team members</p>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <span onClick={() => setShowAddModal(true)}>Add Staff Member</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-green-700 text-sm">{success}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search staff members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium text-sm">
                              {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.full_name && member.full_name.trim() !== '' ? member.full_name : 'No name provided'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {member.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 capitalize">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(member.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => openAssignModal(member)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        Assign Campaigns
                      </button>
                      <button 
                        onClick={() => handleEditStaff(member)}
                        className="text-green-600 hover:text-green-900 mr-4"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleRemoveStaff(member)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-12">
              <UserPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No staff members found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'No staff members match your search.' : 'Get started by adding your first staff member.'}
              </p>
              {!searchTerm && (
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  <span onClick={() => setShowAddModal(true)}>Add First Staff Member</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Staff Member</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddStaff} className="space-y-4">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="full_name"
                  type="text"
                  required
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password"
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Campaign Modal */}
      {showAssignModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Assign Campaigns to {selectedStaff.full_name || selectedStaff.email}
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Available Campaigns */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Campaigns</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {campaigns
                    .filter(campaign => !assignedCampaigns.some(ac => ac.campaign_id === campaign.id))
                    .map((campaign) => (
                      <div
                        key={campaign.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{campaign.name}</h4>
                            {campaign.description && (
                              <p className="text-sm text-gray-600 mt-1">{campaign.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleAssignCampaign(campaign.id)}
                            className="ml-3 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
                {campaigns.filter(campaign => !assignedCampaigns.some(ac => ac.campaign_id === campaign.id)).length === 0 && (
                  <p className="text-gray-500 text-center py-8">All campaigns are already assigned</p>
                )}
              </div>

              {/* Assigned Campaigns */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Assigned Campaigns</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {assignedCampaigns.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="border border-green-200 bg-green-50 rounded-lg p-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{assignment.campaigns.name}</h4>
                          {assignment.campaigns.description && (
                            <p className="text-sm text-gray-600 mt-1">{assignment.campaigns.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnassignCampaign(assignment.id)}
                          className="ml-3 bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {assignedCampaigns.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No campaigns assigned yet</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditStaffModal && staffToEdit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Staff Member</h2>
              <button
                onClick={() => setShowEditStaffModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateStaff} className="space-y-4">
              <div>
                <label htmlFor="edit_full_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  id="edit_full_name"
                  type="text"
                  value={editStaffForm.full_name}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              
              <div>
                <label htmlFor="edit_email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="edit_email"
                  type="email"
                  required
                  value={editStaffForm.email}
                  onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditStaffModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Staff Confirmation Modal */}
      {showDeleteStaffModal && staffToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Remove Staff Member</h2>
              <button
                onClick={() => setShowDeleteStaffModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to remove <strong>{staffToDelete.full_name || staffToDelete.email}</strong> from your team?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  <strong>Warning:</strong> This will:
                </p>
                <ul className="text-yellow-700 text-sm mt-2 ml-4 list-disc">
                  <li>Remove all campaign assignments</li>
                  <li>Delete the staff member's profile</li>
                  <li>This action cannot be undone</li>
                </ul>
              </div>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteStaffModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRemoveStaff}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Remove Staff Member
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default StaffManagement;