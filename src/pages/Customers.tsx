import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, DollarSign, Calendar, CreditCard, Edit2, Trash2, X } from 'lucide-react';

interface Customer {
  id: string;
  lead_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  notes: string;
  converted_at: string;
  converted_by: string;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  customer_id: string;
  amount: number;
  currency: string;
  payment_date: string;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  payment_method: string;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const Customers: React.FC = () => {
  const { user, profile } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [showDeleteCustomerModal, setShowDeleteCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    currency: 'USD',
    payment_date: '',
    due_date: '',
    status: 'pending' as Payment['status'],
    payment_method: '',
    notes: ''
  });

  const [customerForm, setCustomerForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    notes: ''
  });

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  ];

  useEffect(() => {
    fetchCustomers();
    fetchPayments();
  }, [profile]);

  const fetchCustomers = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      let query = supabase.from('customers').select('*');
      
      // If not superadmin, only show customers from their converted leads
      if (profile.role !== 'superadmin') {
        // Get lead IDs that are assigned to this user
        const { data: userLeads, error: leadsError } = await supabase
          .from('leads')
          .select('id')
          .eq('assigned_to', profile.id);

        if (leadsError) {
          console.error('Error fetching user leads:', leadsError);
          setCustomers([]);
          setLoading(false);
          return;
        }

        const leadIds = userLeads?.map(lead => lead.id) || [];
        if (leadIds.length === 0) {
          setCustomers([]);
          setLoading(false);
          return;
        }

        query = query.in('lead_id', leadIds);
      }

      const { data, error } = await query.order('converted_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        setCustomers([]);
      } else {
        console.log('Fetched customers:', data);
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    if (!profile) return;

    try {
      let query = supabase.from('payments').select('*');
      
      // If not superadmin, only show payments for their customers
      if (profile.role !== 'superadmin') {
        const customerIds = customers.map(c => c.id);
        if (customerIds.length > 0) {
          query = query.in('customer_id', customerIds);
        } else {
          setPayments([]);
          return;
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        setPayments([]);
      } else {
        setPayments(data || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    }
  };

  const handleAddPayment = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditingPayment(null);
    setPaymentForm({
      amount: '',
      currency: 'USD',
      payment_date: '',
      due_date: '',
      status: 'pending',
      payment_method: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      amount: payment.amount.toString(),
      currency: payment.currency || 'USD',
      payment_date: payment.payment_date || '',
      due_date: payment.due_date || '',
      status: payment.status,
      payment_method: payment.payment_method || '',
      notes: payment.notes || ''
    });
    setSelectedCustomer(customers.find(c => c.id === payment.customer_id) || null);
    setShowPaymentModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !profile) return;

    console.log('Saving payment with data:', {
      customer_id: selectedCustomer.id,
      amount: parseFloat(paymentForm.amount),
      currency: paymentForm.currency,
      payment_date: paymentForm.payment_date || null,
      due_date: paymentForm.due_date || null,
      status: paymentForm.status,
      payment_method: paymentForm.payment_method || null,
      notes: paymentForm.notes || null,
      created_by: profile.id
    });

    try {
      const paymentData = {
        customer_id: selectedCustomer.id,
        amount: parseFloat(paymentForm.amount),
        currency: paymentForm.currency,
        payment_date: paymentForm.payment_date || null,
        due_date: paymentForm.due_date || null,
        status: paymentForm.status,
        payment_method: paymentForm.payment_method || null,
        notes: paymentForm.notes || null,
        created_by: profile.id
      };

      if (editingPayment) {
        const updateData = { ...paymentData };
        delete updateData.created_by; // Don't update created_by on edit
        updateData.updated_at = new Date().toISOString();
        
        const { error } = await supabase
          .from('payments')
          .update(updateData)
          .eq('id', editingPayment.id);
        
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('payments')
          .insert([paymentData]);
        
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
      }

      setShowPaymentModal(false);
      setEditingPayment(null);
      setSelectedCustomer(null);
      fetchPayments();
      alert(editingPayment ? 'Payment updated successfully!' : 'Payment added successfully!');
    } catch (error) {
      console.error('Error saving payment:', error);
      alert(`Error saving payment: ${error.message || 'Please try again.'}`);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerForm({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || '',
      phone: customer.phone || '',
      company: customer.company || '',
      position: customer.position || '',
      notes: customer.notes || ''
    });
    setShowEditCustomerModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          first_name: customerForm.first_name,
          last_name: customerForm.last_name,
          email: customerForm.email || null,
          phone: customerForm.phone || null,
          company: customerForm.company || null,
          position: customerForm.position || null,
          notes: customerForm.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingCustomer.id);

      if (error) throw error;

      setShowEditCustomerModal(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer. Please try again.');
    }
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowDeleteCustomerModal(true);
  };

  const confirmDeleteCustomer = async () => {
    if (!editingCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', editingCustomer.id);

      if (error) throw error;

      setShowDeleteCustomerModal(false);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer. Please try again.');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
      fetchPayments();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Error deleting payment. Please try again.');
    }
  };

  const getCustomerPayments = (customerId: string) => {
    return payments.filter(p => p.customer_id === customerId);
  };

  const getPaymentSummary = (customerId: string) => {
    const customerPayments = getCustomerPayments(customerId);
    
    // Group by currency
    const byCurrency = customerPayments.reduce((acc, p) => {
      const currency = p.currency || 'USD';
      if (!acc[currency]) {
        acc[currency] = { total: 0, paid: 0, pending: 0 };
      }
      acc[currency].total += p.amount;
      if (p.status === 'paid') acc[currency].paid += p.amount;
      if (p.status === 'pending') acc[currency].pending += p.amount;
      return acc;
    }, {} as Record<string, { total: number; paid: number; pending: number }>);
    
    return byCurrency;
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    return currency?.symbol || currencyCode;
  };

  const getStatusColor = (status: Payment['status']) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Customers will appear here when leads are converted to "Closed Won" status.
            </p>
            <button
              onClick={() => {
                console.log('Debug - Refetching customers...');
                fetchCustomers();
              }}
              className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Refresh Customers
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {customers.map((customer) => {
              const paymentSummaryByCurrency = getPaymentSummary(customer.id);
              const customerPayments = getCustomerPayments(customer.id);

              return (
                <div key={customer.id} className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">{customer.company} • {customer.position}</p>
                      <div className="mt-2 space-y-1">
                        {customer.email && (
                          <p className="text-sm text-gray-600">📧 {customer.email}</p>
                        )}
                        {customer.phone && (
                          <p className="text-sm text-gray-600">📞 {customer.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditCustomer(customer)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                      <button
                        onClick={() => handleAddPayment(customer)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Payment
                      </button>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    {Object.keys(paymentSummaryByCurrency).length > 0 ? (
                      Object.entries(paymentSummaryByCurrency).map(([currency, summary]) => (
                        <div key={currency} className="grid grid-cols-3 gap-4 mb-2 last:mb-0">
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">Total ({currency})</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {getCurrencySymbol(currency)}{summary.total.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">Paid ({currency})</p>
                            <p className="text-lg font-semibold text-green-600">
                              {getCurrencySymbol(currency)}{summary.paid.toFixed(2)}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-500">Pending ({currency})</p>
                            <p className="text-lg font-semibold text-yellow-600">
                              {getCurrencySymbol(currency)}{summary.pending.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500">No payments yet</div>
                    )}
                  </div>

                  {/* Payments List */}
                  {customerPayments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Payments</h4>
                      {customerPayments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-4">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {getCurrencySymbol(payment.currency || 'USD')}{payment.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {payment.payment_date && `Paid: ${new Date(payment.payment_date).toLocaleDateString()}`}
                                {payment.due_date && ` • Due: ${new Date(payment.due_date).toLocaleDateString()}`}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditPayment(payment)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(payment.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {customer.notes && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-700">{customer.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedCustomer && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingPayment ? 'Edit Payment' : 'Add Payment'} - {selectedCustomer.first_name} {selectedCustomer.last_name}
                </h3>
                <form onSubmit={handleSavePayment} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency *</label>
                    <select
                      required
                      value={paymentForm.currency}
                      onChange={(e) => setPaymentForm({ ...paymentForm, currency: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {currencies.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} - {currency.name} ({currency.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                    <input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Due Date</label>
                    <input
                      type="date"
                      value={paymentForm.due_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={paymentForm.status}
                      onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as Payment['status'] })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                      <option value="overdue">Overdue</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                    <input
                      type="text"
                      value={paymentForm.payment_method}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                      placeholder="e.g., Credit Card, Bank Transfer, Cash"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      {editingPayment ? 'Update' : 'Add'} Payment
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showEditCustomerModal && editingCustomer && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Edit Customer</h3>
                  <button
                    onClick={() => setShowEditCustomerModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleSaveCustomer} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">First Name *</label>
                      <input
                        type="text"
                        required
                        value={customerForm.first_name}
                        onChange={(e) => setCustomerForm({ ...customerForm, first_name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={customerForm.last_name}
                        onChange={(e) => setCustomerForm({ ...customerForm, last_name: e.target.value })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Company</label>
                    <input
                      type="text"
                      value={customerForm.company}
                      onChange={(e) => setCustomerForm({ ...customerForm, company: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Position</label>
                    <input
                      type="text"
                      value={customerForm.position}
                      onChange={(e) => setCustomerForm({ ...customerForm, position: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={customerForm.notes}
                      onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowEditCustomerModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                      Update Customer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Customer Modal */}
        {showDeleteCustomerModal && editingCustomer && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Customer</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete <strong>{editingCustomer.first_name} {editingCustomer.last_name}</strong>? 
                  This action cannot be undone and will also delete all associated payments.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteCustomerModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteCustomer}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                  >
                    Delete Customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Customers;