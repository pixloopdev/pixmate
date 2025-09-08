import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout/Layout';
import { supabase, Profile, Campaign } from '../lib/supabase';
import { Users, Megaphone, UserPlus, TrendingUp, BarChart3, Target, Plus, X, AlertCircle, CheckCircle, User, Calendar } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalCampaigns: 0,
    totalLeads: 0,
    myLeads: 0,
    myCampaigns: 0,
    newLeads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [assignedCampaigns, setAssignedCampaigns] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState({
    email: '',
    password: '',
    full_name: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStats();
    if (profile?.role === 'superadmin') {
      fetchStaff();
      fetchCampaigns();
    }
  }, [profile]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');

      if (profile?.role === 'superadmin') {
        // Fetch superadmin stats
        const [staffResult, campaignResult, leadsResult] = await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'staff'),
          supabase.from('campaigns').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('id', { count: 'exact', head: true }),
        ]);

        // Check for errors in any of the queries
        if (staffResult.error) {
          console.error('Error fetching staff count:', staffResult.error);
          setError('Failed to fetch staff statistics');
        }
        if (campaignResult.error) {
          console.error('Error fetching campaign count:', campaignResult.error);
          setError('Failed to fetch campaign statistics');
        }
        if (leadsResult.error) {
          console.error('Error fetching leads count:', leadsResult.error);
          setError('Failed to fetch leads statistics');
        }

        setStats({
          totalStaff: staffResult.count || 0,
          totalCampaigns: campaignResult.count || 0,
          totalLeads: leadsResult.count || 0,
          myLeads: 0,
          myCampaigns: 0,
          newLeads: 0,
        });
      } else {
        // Fetch staff stats
        const [myLeadsResult, myCampaignsResult, newLeadsResult] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('assigned_to', profile?.id),
          supabase
            .from('campaign_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('staff_id', profile?.id),
          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_to', profile?.id)
            .eq('status', 'new'),
        ]);

        // Check for errors
        if (myLeadsResult.error) {
          console.error('Error fetching my leads count:', myLeadsResult.error);
        }
        if (myCampaignsResult.error) {
          console.error('Error fetching my campaigns count:', myCampaignsResult.error);
        }
        if (newLeadsResult.error) {
          console.error('Error fetching new leads count:', newLeadsResult.error);
        }

        setStats({
          totalStaff: 0,
          totalCampaigns: 0,
          totalLeads: 0,
          myLeads: myLeadsResult.count || 0,
          myCampaigns: myCampaignsResult.count || 0,
          newLeads: newLeadsResult.count || 0,
        });
      }
    } catch (error) {
      console.error('Unexpected error fetching stats:', error);
      setError('Failed to load dashboard statistics. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'staff')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching staff:', error);
      } else {
        setStaff(data || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
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
        setShowAddStaffModal(false);
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

  const openAssignModal = (staffMember: Profile) => {
    setSelectedStaff(staffMember);
    setShowAssignModal(true);
    fetchStaffCampaigns(staffMember.id);
  };

  const superAdminCards = [
    {
      title: 'Total Staff',
      value: stats.totalStaff,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Active staff members',
    },
    {
      title: 'Total Campaigns',
      value: stats.totalCampaigns,
      icon: Megaphone,
      color: 'bg-green-500',
      description: 'Marketing campaigns',
    },
    {
      title: 'Total Leads',
      value: stats.totalLeads,
      icon: UserPlus,
      color: 'bg-purple-500',
      description: 'All leads in system',
    },
  ];

  const staffCards = [
    {
      title: 'My Leads',
      value: stats.myLeads,
      icon: UserPlus,
      color: 'bg-blue-500',
      description: 'Assigned to me',
    },
    {
      title: 'My Campaigns',
      value: stats.myCampaigns,
      icon: Megaphone,
      color: 'bg-green-500',
      description: 'Campaigns assigned',
    },
    {
      title: 'New Leads',
      value: stats.newLeads,
      icon: Target,
      color: 'bg-orange-500',
      description: 'Require attention',
    },
  ];

  const cards = profile?.role === 'superadmin' ? superAdminCards : staffCards;

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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome to Pixmate CRM, {profile?.full_name || profile?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{card.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{card.description}</p>
                  </div>
                  <div className={`${card.color} rounded-full p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {profile?.role === 'superadmin' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">My Staffs</h2>
                </div>
                <button
                  onClick={() => setShowAddStaffModal(true)}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Staff</span>
                </button>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              )}
              
              <div className="space-y-3">
                {staff.length > 0 ? (
                  staff.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium text-xs">
                            {member.full_name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.full_name || 'No name'}
                          </p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => openAssignModal(member)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Assign
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No staff members yet</p>
                    <button
                      onClick={() => setShowAddStaffModal(true)}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Add your first staff member
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            
            {profile?.role === 'superadmin' ? (
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/campaigns')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">Create New Campaign</p>
                  <p className="text-sm text-gray-500">Set up a new marketing campaign</p>
                </button>
                <button 
                  onClick={() => setShowAddStaffModal(true)}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">Add Staff Member</p>
                  <p className="text-sm text-gray-500">Invite new team members</p>
                </button>
                <button 
                  onClick={() => navigate('/leads')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">Upload Leads</p>
                  <p className="text-sm text-gray-500">Import leads from CSV file</p>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/leads')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">View My Leads</p>
                  <p className="text-sm text-gray-500">Check assigned leads status</p>
                </button>
                <button 
                  onClick={() => navigate('/leads')}
                  className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-medium text-gray-900">Update Lead Status</p>
                  <p className="text-sm text-gray-500">Mark leads as contacted, qualified, etc.</p>
                </button>
              </div>
            )}
          </div>

          <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${profile?.role === 'superadmin' ? '' : 'lg:col-span-2'}`}>
            <div className="flex items-center space-x-3 mb-4">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">System initialized</p>
                  <p className="text-xs text-gray-500">Welcome to Pixmate CRM</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add New Staff Member</h2>
              <button
                onClick={() => setShowAddStaffModal(false)}
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
                  onClick={() => setShowAddStaffModal(false)}
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
    </Layout>
  );
};

export default Dashboard;