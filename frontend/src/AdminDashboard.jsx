import React, { useState, useEffect, useCallback } from "react";
import "./AdminDashboard.css"; // Make sure this CSS file exists

// --- Helper function to get the auth token ---
const getAuthToken = () => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    handleLogout();
    return null;
  }
  return token;
};

// --- Helper function to handle token expiration ---
const handleApiError = (res) => {
  if (res.status === 401 || res.status === 403) {
    alert("Your session has expired or you lack permissions. Please log in again.");
    handleLogout();
    return true; 
  }
  return false;
};

// --- Helper function for logout ---
const handleLogout = () => {
  localStorage.removeItem("access_token");
  window.location.href = "/login";
};

// --- API Base URL ---
const API_URL = "http://127.0.0.1:8000";

function AdminDashboard() {
  const [selectedPdfFile, setSelectedPdfFile] = useState(null); 
  const [selectedRewardsFile, setSelectedRewardsFile] = useState(null);
  const [selectedDirectoryFile, setSelectedDirectoryFile] = useState(null);

  const [documents, setDocuments] = useState([]); // Used in fetchDocuments
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]); // Used in handleSearch
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]); // Used in fetchUsers
  
  // --- USER COUNTS (This is now used in the JSX) ---
  const userCounts = users.reduce(
    (acc, user) => {
      if (user.role === 'student') {
        acc.student = (acc.student || 0) + 1;
      } else {
        acc[user.role] = (acc[user.role] || 0) + 1;
      }
      return acc;
    },
    { admin: 0, parent: 0, student: 0 }
  );

  // --- FETCH DOCUMENTS ---
  const fetchDocuments = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setMessage("Loading documents...");
    try {
      const res = await fetch(`${API_URL}/ingest/list/`, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (handleApiError(res)) return;

      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []); // <-- Uses setDocuments
        setMessage("");
      } else {
        setMessage("Error loading documents.");
      }
    } catch (error) {
      setMessage("Network error fetching documents.");
    }
  }, []);

  // --- FETCH USERS ---
  const fetchUsers = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;
    
    try {
      const res = await fetch(`${API_URL}/auth/users`, {
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (handleApiError(res)) return;

      if (res.ok) {
        const data = await res.json();
        setUsers(data || []); // <-- Uses setUsers
      } else {
        console.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Network error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
    fetchUsers();
  }, [fetchDocuments, fetchUsers]);

  // --- File change handlers ---
  const handlePdfFileChange = (e) => setSelectedPdfFile(e.target.files[0]);
  const handleRewardsFileChange = (e) => setSelectedRewardsFile(e.target.files[0]);
  const handleDirectoryFileChange = (e) => setSelectedDirectoryFile(e.target.files[0]);

  // --- Generic file upload handler ---
  const handleFileUpload = async (file, endpoint, fileType) => {
    const token = getAuthToken();
    if (!token) return;

    if (!file) {
      setMessage(`Please select a ${fileType} file first.`);
      return;
    }

    setMessage(`Uploading ${fileType} file...`);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData,
      });

      if (handleApiError(res)) return;
      
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        // Clear the specific file input
        if (fileType === 'PDF') {
          setSelectedPdfFile(null);
          document.querySelector('input[name="pdfFile"]').value = "";
        } else if (fileType === 'Rewards CSV') {
          setSelectedRewardsFile(null);
          document.querySelector('input[name="rewardsFile"]').value = "";
        } else if (fileType === 'Directory CSV') {
          setSelectedDirectoryFile(null);
          document.querySelector('input[name="directoryFile"]').value = "";
        }
        
        if (fileType === 'PDF') {
          fetchDocuments();
        }
      } else {
        setMessage(`Upload Failed: ${data.detail}`);
      }
    } catch (error) {
      setMessage(`Network error during ${fileType} upload.`);
    }
  };

  // --- Specific upload functions ---
  const handleUploadPdf = () => {
    handleFileUpload(selectedPdfFile, "/ingest/upload/", "PDF");
  };
  const handleUploadRewards = () => {
    handleFileUpload(selectedRewardsFile, "/ingest/upload_rewards/", "Rewards CSV");
  };
  const handleUploadDirectory = () => {
    handleFileUpload(selectedDirectoryFile, "/ingest/upload_directory/", "Directory CSV");
  };

  // --- SEARCH DOCUMENTS ---
  const handleSearch = async () => {
    const token = getAuthToken();
    if (!token) return;

    if (!searchQuery.trim()) {
      setSearchResults([]); // <-- Uses setSearchResults
      return;
    }
    
    try {
      const res = await fetch(
        `${API_URL}/ingest/search/?query=${encodeURIComponent(searchQuery)}`,
        {
          headers: { "Authorization": `Bearer ${token}` },
        }
      );

      if (handleApiError(res)) return;
      
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data); // <-- Uses setSearchResults
      } else {
        setMessage("Search failed.");
      }
    } catch (error) {
      setMessage("Network error during search.");
    }
  };

  // --- DELETE DOCUMENT ---
  const handleDelete = async (filename) => {
    const token = getAuthToken();
    if (!token) return;

    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;

    setMessage(`Deleting ${filename}...`);
    try {
      const res = await fetch(`${API_URL}/ingest/delete/${filename}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (handleApiError(res)) return;

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        fetchDocuments(); // Refresh the list
      } else {
        setMessage(`Delete Failed: ${data.detail}`);
      }
    } catch (error) {
      setMessage("Network error during delete.");
    }
  };

  // --- DELETE ALL DOCUMENTS ---
  const handleDeleteAll = async () => {
    const token = getAuthToken();
    if (!token) return;
    
    if (!window.confirm("DANGER: Are you sure you want to delete ALL documents?")) return;

    setMessage("Deleting all documents...");
    try {
      const res = await fetch(`${API_URL}/ingest/delete_collection/`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });
      
      if (handleApiError(res)) return;
      
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        fetchDocuments(); // Refresh the list
      } else {
        setMessage(`Delete Failed: ${data.detail}`);
      }
    } catch (error) {
      setMessage("Network error during delete all.");
    }
  };

  return (
    <div className="admin-body">
      <header className="admin-header">
        <h1>Admin Dashboard</h1>
        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* --- USER SUMMARY CARDS --- */}
      <section className="summary-section">
        <div className="summary-card admin">
          <h3>Admins</h3>
          <p>{userCounts.admin}</p> {/* <-- Uses userCounts */}
        </div>
        <div className="summary-card parent">
          <h3>Parents</h3>
          <p>{userCounts.parent}</p> {/* <-- Uses userCounts */}
        </div>
        <div className="summary-card user">
          <h3>Students</h3>
          <p>{userCounts.student}</p> {/* <-- Uses userCounts */}
        </div>
      </section>

      <main className="admin-main">
        {message && <div className="admin-message">{message}</div>}

        <div className="admin-grid">
          {/* --- LEFT COLUMN: DOCUMENT MANAGEMENT --- */}
          <div className="doc-management">
            <h2>📄 Document & Data Management</h2>

            <div className="admin-card">
              <h3>Upload PDF Knowledge</h3>
              <p>Adds new documents to the bot's RAG knowledge base.</p>
              <input type="file" accept=".pdf" name="pdfFile" onChange={handlePdfFileChange} />
              <button onClick={handleUploadPdf} disabled={!selectedPdfFile}>
                Upload PDF
              </button>
            </div>
            
            <div className="admin-card">
              <h3>Upload Student Rewards (CSV)</h3>
              <p>Replaces the entire `student_rewards` table with new data.</p>
              <input type="file" accept=".csv" name="rewardsFile" onChange={handleRewardsFileChange} />
              <button onClick={handleUploadRewards} disabled={!selectedRewardsFile}>
                Upload Rewards CSV
              </button>
            </div>

            <div className="admin-card">
              <h3>Upload Student Directory (CSV)</h3>
              <p>Replaces the entire `student_directory` (Email/Roll) table.</p>
              <input type="file" accept=".csv" name="directoryFile" onChange={handleDirectoryFileChange} />
              <button onClick={handleUploadDirectory} disabled={!selectedDirectoryFile}>
                Upload Directory CSV
              </button>
            </div>
            
            <div className="admin-card">
              <h3>Search PDF Content</h3>
              <input
                type="text"
                placeholder="Search document content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button onClick={handleSearch}>Search</button>
              <div className="search-results">
                {searchResults.map((result, index) => (
                  <div key={index} className="result-item">
                    <strong>{result.source} (Page: {result.page})</strong>
                    <p>{result.preview}...</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="admin-card">
              <h3>Uploaded PDFs</h3>
              <ul className="doc-list">
                {documents.length > 0 ? (
                  documents.map((doc, index) => (
                    <li key={index}>
                      <span>{doc}</span>
                      <button className="delete-btn" onClick={() => handleDelete(doc)}>
                        Delete
                      </button>
                    </li>
                  ))
                ) : (
                  <li>No PDF documents found.</li>
                )}
              </ul>
            </div>

            <div className="admin-card danger-zone">
              <h3>Reset Database </h3>
              <p>This only deletes the PDF knowledge base, not student data.</p>
              <button className="delete-all-btn" onClick={handleDeleteAll}>
                Delete All PDFs
              </button>
            </div>
          </div>

          {/* --- RIGHT COLUMN: USER STATUS --- */}
          <div className="user-status">
            <h2>👥 User Status</h2>
            <div className="admin-card">
              <h3>Active Users</h3>
              <table className="user-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Last Login</th> 
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>
                        <span className={`status-dot ${user.status.toLowerCase()}`}></span>
                        {user.status}
                      </td>
                      <td>
                       {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;