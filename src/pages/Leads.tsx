import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { supabase, Lead } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Search, Filter, Upload, Phone, Mail, Building, User, MessageSquare, X, Send } from 'lucide-react';

const Leads: React.FC = () => {
  const { profile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newComment, setNewComment] = useState('');
  const [leadComments, setLeadComments] = useState<any[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    notes: '',
    campaign_id: '',
  });
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCampaignForUpload, setSelectedCampaignForUpload] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const statusOptions = [
    { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'interested', label: 'Interested', color: 'bg-green-100 text-green-800' },
    { value: 'not_interested', label: 'Not interested', color: 'bg-red-100 text-red-800' },
    { value: 'potential', label: 'Potential', color: 'bg-purple-100 text-purple-800' },
    { value: 'not_attended', label: 'Not attended', color: 'bg-gray-100 text-gray-800' },
    { value: 'busy_call_back', label: 'Busy/Call back', color: 'bg-orange-100 text-orange-800' },
    { value: 'pay_later', label: 'Pay later', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'qualified', label: 'Qualified', color: 'bg-purple-100 text-purple-800' },
    { value: 'proposal', label: 'Proposal', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-100 text-orange-800' },
    { value: 'closed_won', label: 'Closed Won', color: 'bg-green-100 text-green-800' },
    { value: 'closed_lost', label: 'Closed Lost', color: 'bg-red-100 text-red-800' },
  ];

  useEffect(() => {
    fetchLeads();
    if (profile?.role === 'superadmin') {
      fetchCampaigns();
    }
  }, [profile]);

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

  const fetchLeads = async () => {
    try {
      let query = supabase.from('leads').select(`
        *,
        campaigns(name)
      `);

      if (profile?.role === 'staff') {
        // Staff can see leads assigned to them OR leads from campaigns they're assigned to
        const { data: assignedCampaigns, error: campaignError } = await supabase
          .from('campaign_assignments')
          .select('campaign_id')
          .eq('staff_id', profile.id);

        if (campaignError) {
          console.error('Error fetching assigned campaigns:', campaignError);
          setLeads([]);
          setLoading(false);
          return;
        }

        const campaignIds = assignedCampaigns?.map(ca => ca.campaign_id) || [];
        
        if (campaignIds.length > 0) {
          // Show leads that are either assigned to the staff member OR from their assigned campaigns
          query = query.or(`assigned_to.eq.${profile.id},campaign_id.in.(${campaignIds.join(',')})`);
        } else {
          // If no campaigns assigned, only show directly assigned leads
          query = query.eq('assigned_to', profile.id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching leads:', error);
      } else {
        setLeads(data || []);
      }
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (leadId: string, newStatus: string) => {
    try {
      // Validate inputs
      if (!leadId || !newStatus) {
        console.error('Invalid parameters for status update:', { leadId, newStatus });
        return;
      }

      // Get the current lead data before updating
      const { data: currentLead, error: fetchError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (fetchError) {
        console.error('Error fetching lead data:', fetchError);
        setError('Failed to fetch lead data');
        return;
      }

      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) {
        console.error('Error updating lead status:', error.message, error.details);
        setError(`Failed to update lead status: ${error.message}`);
      } else {
        // If status is changed to "closed_won", create a customer record
        if (newStatus === 'closed_won' && currentLead) {
          console.log('Converting lead to customer:', currentLead);
          try {
            const { data: customerData, error: customerError } = await supabase
              .from('customers')
              .insert([{
                lead_id: currentLead.id,
                first_name: currentLead.first_name,
                last_name: currentLead.last_name,
                email: currentLead.email,
                phone: currentLead.phone,
                company: currentLead.company,
                position: currentLead.position,
                notes: currentLead.notes,
                converted_by: profile?.id,
                converted_at: new Date().toISOString(),
              }])
              .select();

            if (customerError) {
              console.error('Error creating customer:', customerError);
              setError('Lead status updated but failed to create customer record');
            } else {
              console.log('Customer created successfully:', customerData);
              setSuccess('Lead converted to customer successfully!');
            }
          } catch (customerCreateError) {
            console.error('Error creating customer:', customerCreateError);
            setError('Lead status updated but failed to create customer record');
          }
        } else {
          setSuccess('Lead status updated successfully!');
        }

        // Also record the status change in history
        if (profile?.id) {
          const { error: historyError } = await supabase.from('lead_status_history').insert([{
            lead_id: leadId,
            new_status: newStatus,
            changed_by: profile.id,
            changed_at: new Date().toISOString()
          }]);
          
          if (historyError) {
            console.error('Error recording status history:', historyError.message);
          }
        }
        
        fetchLeads();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Unexpected error updating lead status:', error);
      setError('An unexpected error occurred while updating the lead status.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setCsvFile(file);
      setError('');
    } else {
      setError('Please select a valid CSV file');
      setCsvFile(null);
    }
  };

  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const leads = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map(v => v.trim());
      if (values.length >= 4) {
        const firstName = values[0] || '';
        const middleName = values[1] || '';
        const phoneLabel = values[2] || '';
        const phoneValue = values[3] || '';

        // Combine first and middle name
        const fullName = `${firstName} ${middleName}`.trim();
        const [first, ...rest] = fullName.split(' ');
        
        leads.push({
          first_name: first || 'Unknown',
          last_name: rest.join(' ') || '',
          phone: phoneValue,
          notes: phoneLabel ? `Phone type: ${phoneLabel}` : '',
          status: 'new',
        });
      }
    }

    return leads;
  };

  const handleCSVUpload = async () => {
    if (!csvFile) {
      setError('Please select a CSV file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    try {
      const csvText = await csvFile.text();
      const parsedLeads = parseCSV(csvText);

      if (parsedLeads.length === 0) {
        setError('No valid leads found in CSV file');
        setUploading(false);
        return;
      }

      // Add campaign_id to each lead if selected
      const leadsWithCampaign = parsedLeads.map(lead => ({
        ...lead,
        campaign_id: selectedCampaignForUpload || null
      }));

      // Upload leads in batches
      const batchSize = 10;
      let uploaded = 0;

      for (let i = 0; i < leadsWithCampaign.length; i += batchSize) {
        const batch = leadsWithCampaign.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from('leads')
          .insert(batch);

        if (error) {
          console.error('Error uploading batch:', error);
          setError(`Error uploading leads: ${error.message}`);
          setUploading(false);
          return;
        }

        uploaded += batch.length;
        setUploadProgress((uploaded / leadsWithCampaign.length) * 100);
      }

      setSuccess(`Successfully uploaded ${uploaded} leads!`);
      setCsvFile(null);
      setSelectedCampaignForUpload('');
      fetchLeads();
      
      setTimeout(() => {
        setShowUploadModal(false);
        setSuccess('');
        setUploadProgress(0);
      }, 2000);

    } catch (error: any) {
      setError(`Error processing CSV: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setEditForm({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      position: lead.position || '',
      notes: lead.notes || '',
      campaign_id: lead.campaign_id || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    try {
      // Convert empty campaign_id to null for UUID field
      const updateData = {
        ...editForm,
        campaign_id: editForm.campaign_id || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', selectedLead.id);

      if (error) {
        setError(`Error updating lead: ${error.message}`);
      } else {
        setSuccess('Lead updated successfully!');
        setShowEditModal(false);
        fetchLeads();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      setError(`Error updating lead: ${error.message}`);
    }
  };

  const handleDeleteLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDeleteModal(true);
  };

  const confirmDeleteLead = async () => {
    if (!selectedLead) return;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', selectedLead.id);

      if (error) {
        setError(`Error deleting lead: ${error.message}`);
      } else {
        setSuccess('Lead deleted successfully!');
        setShowDeleteModal(false);
        fetchLeads();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      setError(`Error deleting lead: ${error.message}`);
    }
  };

  const handleViewNotes = async (lead: Lead) => {
    setSelectedLead(lead);
    setShowNotesModal(true);
    setLoadingComments(true);
    
    try {
      // Fetch comments/notes for this lead
      const { data, error } = await supabase
        .from('lead_status_history')
        .select(`
          *,
          profiles(full_name, email)
        `)
        .eq('lead_id', lead.id)
        .order('changed_at', { ascending: false });

      if (error) {
        console.error('Error fetching lead comments:', error);
        setError('Failed to load comments');
      } else {
        setLeadComments(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching lead comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newComment.trim() || !profile) return;

    try {
      const { error } = await supabase.from('lead_status_history').insert([{
        lead_id: selectedLead.id,
        old_status: selectedLead.status,
        new_status: selectedLead.status,
        changed_by: profile.id,
        notes: newComment.trim(),
        changed_at: new Date().toISOString()
      }]);

      if (error) {
        console.error('Error adding comment:', error);
        setError('Failed to add comment');
      } else {
        setNewComment('');
        setSuccess('Comment added successfully!');
        // Refresh comments
        handleViewNotes(selectedLead);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error: any) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment');
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  };

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
            <h1 className="text-3xl font-bold text-gray-900">
              {profile?.role === 'superadmin' ? 'All Leads' : 'My Leads'}
            </h1>
            <p className="text-gray-600 mt-2">
              {profile?.role === 'superadmin' 
                ? 'Manage all leads in the system' 
                : 'Manage your assigned leads'}
            </p>
          </div>
          {profile?.role === 'superadmin' && (
            <button 
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Upload className="h-5 w-5" />
              <span>Upload CSV</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <div className="h-5 w-5 text-red-500">⚠</div>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                <div className="h-5 w-5 text-green-500">✓</div>
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                >
                  <option value="">All Status</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {profile?.role === 'superadmin' && (
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedLeads.length > 0 && selectedLeads.length === filteredLeads.length}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Campaign
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => {
                  const statusConfig = getStatusConfig(lead.status);
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      {profile?.role === 'superadmin' && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedLeads.includes(lead.id)}
                            onChange={() => handleSelectLead(lead.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {lead.first_name} {lead.last_name}
                            </div>
                            {lead.position && (
                              <div className="text-sm text-gray-500">{lead.position}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center text-sm text-gray-900">
                              <Mail className="h-4 w-4 mr-2 text-gray-400" />
                              {lead.email}
                            </div>
                          )}
                          {lead.phone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="h-4 w-4 mr-2 text-gray-400" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {lead.company && (
                          <div className="flex items-center text-sm text-gray-900">
                            <Building className="h-4 w-4 mr-2 text-gray-400" />
                            {lead.company}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusUpdate(lead.id, e.target.value)}
                          className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${statusConfig.color} focus:ring-2 focus:ring-blue-500`}
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(lead as any).campaigns?.name || 'No campaign'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => handleEditLead(lead)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => handleViewNotes(lead)}
                          className="text-green-600 hover:text-green-900 mr-4"
                        >
                          Notes
                        </button>
                        {profile?.role === 'superadmin' && (
                          <button 
                            onClick={() => handleDeleteLead(lead)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="text-center py-12">
              <UserPlus className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter 
                  ? 'No leads match your current filters.' 
                  : profile?.role === 'superadmin'
                    ? 'Upload leads from CSV to get started.'
                    : 'No leads have been assigned to you yet.'}
              </p>
              {!searchTerm && !statusFilter && profile?.role === 'superadmin' && (
                <button 
                  onClick={() => setShowUploadModal(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <Upload className="h-5 w-5" />
                  <span>Upload First CSV</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Upload CSV File</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {csvFile && (
                  <p className="text-sm text-gray-600 mt-2">
                    Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Campaign (Optional)
                </label>
                <select
                  value={selectedCampaignForUpload}
                  onChange={(e) => setSelectedCampaignForUpload(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">No campaign (assign later)</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a campaign to automatically assign all uploaded leads to it
                </p>
              </div>

              <div className="text-sm text-gray-600">
                <p className="font-medium mb-2">Expected CSV format:</p>
                <p>First Name, Middle Name, Phone Label, Phone Value</p>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCSVUpload}
                disabled={!csvFile || uploading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload CSV'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Lead</h2>
            
            <form onSubmit={handleUpdateLead} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company
                </label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  value={editForm.position}
                  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {profile?.role === 'superadmin' && campaigns.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign
                  </label>
                  <select
                    value={editForm.campaign_id}
                    onChange={(e) => setEditForm({ ...editForm, campaign_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">No campaign</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes and Comments Modal */}
      {showNotesModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Notes & Comments
                </h2>
                <p className="text-gray-600">
                  {selectedLead.first_name} {selectedLead.last_name}
                </p>
              </div>
              <button
                onClick={() => setShowNotesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Lead Notes Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Lead Notes</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700">
                  {selectedLead.notes || 'No notes available for this lead.'}
                </p>
              </div>
            </div>

            {/* Comments Section */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Activity & Comments</h3>
              
              {loadingComments ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {leadComments.length > 0 ? (
                    leadComments.map((comment) => (
                      <div key={comment.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-xs">
                                {comment.profiles?.full_name?.charAt(0) || comment.profiles?.email?.charAt(0) || 'U'}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {comment.profiles?.full_name || comment.profiles?.email || 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(comment.changed_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          {comment.old_status !== comment.new_status && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                              Status Change
                            </span>
                          )}
                        </div>
                        
                        {comment.old_status !== comment.new_status && (
                          <div className="mb-2 text-sm text-gray-600">
                            Status changed from <span className="font-medium">{comment.old_status}</span> to{' '}
                            <span className="font-medium">{comment.new_status}</span>
                          </div>
                        )}
                        
                        {comment.notes && (
                          <p className="text-gray-700 text-sm">{comment.notes}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No activity or comments yet.</p>
                  )}
                </div>
              )}
            </div>

            {/* Add Comment Form */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Add Comment</h4>
              <form onSubmit={handleAddComment} className="space-y-3">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment or note about this lead..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setShowNotesModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={!newComment.trim()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Add Comment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Delete Lead</h2>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong>{selectedLead.first_name} {selectedLead.last_name}</strong>? 
              This action cannot be undone.
            </p>
            
            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLead}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Leads;
