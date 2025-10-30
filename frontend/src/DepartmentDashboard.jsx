import React, { useState, useEffect, useCallback } from 'react';
import './AdminDashboard.css'; // Reuse admin styles
import './DepartmentDashboard.css'; // Add new styles

const API_URL = "http://127.0.0.1:8000";

// --- (Copy helper functions from AdminDashboard) ---
const getAuthToken = () => {
    const token = localStorage.getItem("access_token");
    if (!token) { handleLogout(); return null; }
    return token;
};
const handleLogout = () => {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
};
const handleApiError = (res) => {
    if (res.status === 401 || res.status === 403) {
        alert("Session expired. Please log in again.");
        handleLogout();
        return true;
    }
    return false;
};

function DepartmentDashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);

  const fetchTickets = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/department/tickets`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (handleApiError(res)) return;
      if (!res.ok) throw new Error("Failed to fetch tickets");
      
      const data = await res.json();
      setTickets(data.tickets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleUpdateStatus = async (ticketId, message, status) => {
    const token = getAuthToken();
    if (!token) return;

    if (!message.trim()) {
        alert("Please provide a reply message.");
        return;
    }

    try {
      const res = await fetch(`${API_URL}/department/resolve`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ticket_id: ticketId, message: message, status: status })
      });
      if (handleApiError(res)) return;
      if (!res.ok) throw new Error((await res.json()).detail || "Failed to update ticket");
      
      // Success! Refresh list and close modal
      fetchTickets();
      setSelectedTicket(null);
      setReplyMessage("");
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const openReplyModal = (ticket) => {
    setSelectedTicket(ticket);
    setReplyMessage(""); // Clear old message
  };

  const newTickets = tickets.filter(t => t.status === 'New');
  const inProgressTickets = tickets.filter(t => t.status === 'In Progress');
  const resolvedTickets = tickets.filter(t => t.status === 'Resolved');

  return (
    <div className="admin-body">
      <header className="admin-header">
        <h1>Department Feedback Dashboard</h1>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </header>
      
      <main className="admin-main">
        {loading && <p>Loading tickets...</p>}
        {error && <p className="admin-message error">{error}</p>}
        
        <div className="admin-card">
          <h3>New Tickets ({newTickets.length})</h3>
          <table className="user-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>From</th>
                <th>Message</th>
                <th>Department</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {newTickets.map(ticket => (
                <tr key={ticket.ticket_id}>
                  <td>{ticket.ticket_id}</td>
                  <td>{ticket.user_name || ticket.user_email}</td>
                  <td className="ticket-message">{ticket.original_message}</td>
                  <td>{ticket.department}</td>
                  <td>{new Date(ticket.created_at).toLocaleString()}</td>
                  <td>
                    <button onClick={() => openReplyModal(ticket)}>Reply / Resolve</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-card">
          <h3>In Progress ({inProgressTickets.length})</h3>
          {/* (Table for In Progress tickets - same structure) */}
        </div>

        <div className="admin-card">
          <h3>Resolved ({resolvedTickets.length})</h3>
          {/* (Table for Resolved tickets - same structure) */}
        </div>
        
      </main>

      {/* Reply Modal */}
      {selectedTicket && (
        <div className="modal-backdrop">
          <div className="modal-content admin-card">
            <h3>Resolve Ticket #{selectedTicket.ticket_id}</h3>
            <p><strong>From:</strong> {selectedTicket.user_name || selectedTicket.user_email}</p>
            <p><strong>Original Message:</strong> {selectedTicket.original_message}</p>
            
            <textarea
              placeholder="Type your custom reply here..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              style={{ width: '100%', minHeight: '100px', margin: '10px 0' }}
            />
            
            <div className="modal-actions">
              <button onClick={() => handleUpdateStatus(selectedTicket.ticket_id, "We are working on your issue. It will be resolved soon.", "In Progress")}>
                Mark "In Progress"
              </button>
              <button className="delete-btn" onClick={() => handleUpdateStatus(selectedTicket.ticket_id, "Your issue has been resolved.", "Resolved")}>
                Mark "Resolved"
              </button>
              <button 
                onClick={() => handleUpdateStatus(selectedTicket.ticket_id, replyMessage, "Resolved")}
                disabled={!replyMessage.trim()}
              >
                Send Custom Reply & Resolve
              </button>
              <button onClick={() => setSelectedTicket(null)} style={{backgroundColor: '#6c757d'}}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DepartmentDashboard;