import React, { useEffect, useState } from "react";
import "./style.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function App() {

  const [email, setEmail] = useState("priya.sharma@email.com");

  const [password, setPassword] = useState("Bookleaf@123");

  const [token, setToken] = useState("");

  const [user, setUser] = useState(null);

  const [books, setBooks] = useState([]);

  const [tickets, setTickets] = useState([]);
  const [ticketMessages, setTicketMessages] = useState({});
const [expandedTicketId, setExpandedTicketId] = useState(null);

  const [subject, setSubject] = useState("");

  const [description, setDescription] = useState("");

  const [bookId, setBookId] = useState("");

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [selectedTicket, setSelectedTicket] = useState(null);

  const [ticketDetails, setTicketDetails] = useState(null);

  const [messages, setMessages] = useState([]);

  const [draft, setDraft] = useState("");

  const [reply, setReply] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const [priorityFilter, setPriorityFilter] = useState("All");

  const [categoryFilter, setCategoryFilter] = useState("All");

  async function request(path, options = {}) {

    const response = await fetch(`${API}${path}`, {

      ...options,

      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }

    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(data.error || "Request failed");

    return data;

  }

  async function login(e) {

    e.preventDefault(); setError(""); setNotice("");

    try {

      const result = await request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

      setToken(result.token); setUser(result.user);

    } catch (err) { setError(err.message); }

  }

  useEffect(() => {

    if (!token || !user) return;

    let active = true;

    async function load() {

      try {

        const [bookData, ticketData] = await Promise.all([request("/books"), request("/tickets")]);

        if (active) { setBooks(bookData.books || []); setTickets(ticketData.tickets || []); }

      } catch (err) { if (active) setError(err.message); }

    }

    load();

    const interval = setInterval(load, 8000);

    return () => { active = false; clearInterval(interval); };

  }, [token, user?.id]);

  
async function toggleTicketConversation(ticketId) {
  setError("");

  // Close the conversation if it is already open.
  if (expandedTicketId === ticketId) {
    setExpandedTicketId(null);
    return;
  }

  setExpandedTicketId(ticketId);

  try {
    const result = await request(`/tickets/${ticketId}`);

    setTicketMessages((previous) => ({
      ...previous,
      [ticketId]: result.messages || []
    }));
  } catch (err) {
    setError(err.message);
  }
}


  async function submitTicket(e) {

    e.preventDefault(); setError(""); setNotice("");

    try {

      await request("/tickets", { method: "POST", body: JSON.stringify({ subject, description, bookId: bookId || null }) });

      setSubject(""); setDescription(""); setBookId(""); setNotice("Your ticket has been submitted.");

      const result = await request("/tickets"); setTickets(result.tickets || []);

    } catch (err) { setError(err.message); }

  }

  async function openTicket(ticket) {

    setError("");

    setNotice("");

    setSelectedTicket(ticket);

    setTicketDetails(null);

    setMessages([]);

    setDraft("");

    setReply("");

    try {

      const result = await request(`/tickets/${ticket.id}`);

      setTicketDetails(result.ticket);

      setMessages(result.messages || []);

    } catch (err) {

      setError(err.message);

    }

  }

  async function changeTicketStatus(id, status) {

    setError("");

    setNotice("");

    try {

      await request(`/tickets/${id}/status`, {

        method: "PATCH",

        body: JSON.stringify({ status })

      });

      const result = await request("/tickets");

      setTickets(result.tickets || []);

      if (selectedTicket?.id === id) {

        const updated = await request(`/tickets/${id}`);

        setTicketDetails(updated.ticket);

        setMessages(updated.messages || []);

      }

      setNotice("Ticket status updated.");

    } catch (err) {

      setError(err.message);

    }

  }

  async function generateDraft(id) {

    setError("");

    setNotice("");

    try {

      const result = await request(`/tickets/${id}/draft`, {

        method: "POST"

      });

      setDraft(result.draft || "");

      setNotice("AI draft generated. Review it before sending.");

    } catch (err) {

      setError(err.message);

    }

  }

  async function sendReply(id) {

    const body = reply.trim();

    if (!body) {

      setError("Please enter a reply.");

      return;

    }

    setError("");

    setNotice("");

    try {

      await request(`/tickets/${id}/messages`, {

        method: "POST",

        body: JSON.stringify({ body, isInternal: false })

      });

      const result = await request(`/tickets/${id}`);

      setTicketDetails(result.ticket);

      setMessages(result.messages || []);

      setReply("");

      setNotice("Reply sent successfully.");

      const ticketResult = await request("/tickets");

      setTickets(ticketResult.tickets || []);

    } catch (err) {

      setError(err.message);

    }

  }

  function logout() { setToken(""); setUser(null); setBooks([]); setTickets([]); setNotice(""); }

  if (!user) return <main className="login-shell"><section className="login-card">

    <div className="brand-mark">B</div><p className="eyebrow">BOOKLEAF PUBLISHING</p><h1>Author Support Portal</h1>

    <p className="muted">Sign in to view your books and get support.</p>

    <form onSubmit={login} className="stack">

      <label>Email address<input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></label>

      <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></label>

      {error && <p className="error">{error}</p>}

      <button className="primary">Sign in</button>

    </form><p className="hint">Demo author: priya.sharma@email.com / Bookleaf@123</p>

    <p className="hint">Admin demo: admin@bookleaf.test / Admin@12345 (admin interface is the next milestone).</p>

  </section></main>;

  if (user.role === "admin") {

    const filteredTickets = tickets.filter((t) => {

      const statusMatch =

        statusFilter === "All" || t.status === statusFilter;

      const priorityMatch =

        priorityFilter === "All" ||

        String(t.priority).toLowerCase() ===

        priorityFilter.toLowerCase();

      const categoryMatch =

        categoryFilter === "All" || t.category === categoryFilter;

      return statusMatch && priorityMatch && categoryMatch;

    });

    const categories = [

      ...new Set(tickets.map((t) => t.category).filter(Boolean))

    ];

    return (

      <main className="app-shell">

        <header className="topbar">

          <div className="brand">

            <span className="brand-mark small">B</span>

            <div>

              <strong>BookLeaf</strong>

              <small>Admin Support Console</small>

            </div>

          </div>

          <div className="user-menu">

            <span>{user.name}</span>

            <button className="ghost" onClick={logout}>

              Log out

            </button>

          </div>

        </header>

        <section className="welcome">

          <p className="eyebrow">ADMIN DASHBOARD</p>

          <h1>Support management</h1>

          <p className="muted">

            Review author requests, manage ticket status, and prepare

            AI-assisted replies.

          </p>

        </section>

        {error && <p className="error banner">{error}</p>}

        {notice && <p className="success banner">{notice}</p>}

        <section className="stats">

          <article className="stat-card">

            <span>Total tickets</span>

            <strong>{tickets.length}</strong>

          </article>

          <article className="stat-card">

            <span>Open</span>

            <strong>

              {tickets.filter((t) => t.status === "Open").length}

            </strong>

          </article>

          <article className="stat-card">

            <span>In progress</span>

            <strong>

              {tickets.filter((t) => t.status === "In Progress").length}

            </strong>

          </article>

          <article className="stat-card">

            <span>Unresolved</span>

            <strong>

              {tickets.filter(

                (t) => !["Resolved", "Closed"].includes(t.status)

              ).length}

            </strong>

          </article>

        </section>

        <section className="panel">

          <h2>All support tickets</h2>

          <p className="muted">

            Select a ticket to view its conversation and manage it.

          </p>

         <div className="admin-filters">

            <label>

              Status

              <select

                value={statusFilter}

                onChange={(e) => setStatusFilter(e.target.value)}

              >

                <option>All</option>

                <option>Open</option>

                <option>In Progress</option>

                <option>Resolved</option>

                <option>Closed</option>

              </select>

            </label>

            <label>

              Priority

              <select

                value={priorityFilter}

                onChange={(e) => setPriorityFilter(e.target.value)}

              >

                <option>All</option>

                <option>Critical</option>

                <option>High</option>

                <option>Medium</option>

                <option>Low</option>

              </select>

            </label>

            <label>

              Category

              <select

                value={categoryFilter}

                onChange={(e) => setCategoryFilter(e.target.value)}

              >

                <option>All</option>

                {categories.map((category) => (

                  <option key={category}>{category}</option>

                ))}

              </select>

            </label>

          </div>

          {filteredTickets.length ? (

            <div className="ticket-list">

              {filteredTickets.map((t) => (

                <article className="ticket" key={t.id}>

                  <div className="ticket-title">

                    <strong>#{t.id} · {t.subject}</strong>

                    <span className="status production">{t.status}</span>

                  </div>

                  <p>{t.description}</p>

                  <div className="ticket-meta">

                    <span>Author: {t.author_name || t.author_user_id}</span>

                    <span>{t.category}</span>

                    <span>{t.priority} priority</span>

                  </div>

                  <button

                    className="primary"

                    onClick={() => openTicket(t)}

                  >

                    View and manage

                  </button>

                </article>

              ))}

            </div>

          ) : (

            <p className="empty">No tickets match these filters.</p>

          )}

        </section>

        {selectedTicket && (

          <section className="panel admin-detail-panel">

            <h2>

              Ticket #{selectedTicket.id}: {selectedTicket.subject}

            </h2>

            {ticketDetails ? (

              <>

                <p>{ticketDetails.description}</p>

                <label>

                  Update status

                  <select

                    value={ticketDetails.status}

                    onChange={(e) =>

                      changeTicketStatus(

                        selectedTicket.id,

                        e.target.value

                      )

                    }

                  >

                    <option>Open</option>

                    <option>In Progress</option>

                    <option>Resolved</option>

                    <option>Closed</option>

                  </select>

                </label>

                <h3>Conversation</h3>

                {messages.length ? (

                  <div className="ticket-list">

                    {messages.map((m) => (

                      <article className="ticket" key={m.id}>

                        <strong>{m.sender_role}</strong>

                        <p>{m.body}</p>

                        <small>

                          {new Date(m.created_at).toLocaleString()}

                        </small>

                      </article>

                    ))}

                  </div>

                ) : (

                  <p className="empty">No messages yet.</p>

                )}

                <h3>AI-assisted reply</h3>

                <p className="muted">

                  Generate a draft, review it, edit if needed, and send.

                </p>

                <button

                  className="ghost"

                  onClick={() => generateDraft(selectedTicket.id)}

                >

                  Generate AI draft

                </button>

                <label>

                  Draft response

                  <textarea

                    rows="5"

                    value={draft}

                    onChange={(e) => setDraft(e.target.value)}

                    placeholder="Your AI-generated draft will appear here."

                  />

                </label>

                <button

                  className="ghost"

                  onClick={() => setReply(draft)}

                  disabled={!draft.trim()}

                >

                  Use draft as reply

                </button>

                <label>

                  Reply to author

                  <textarea

                    rows="4"

                    value={reply}

                    onChange={(e) => setReply(e.target.value)}

                    placeholder="Write your response to the author."

                  />

                </label>

                <button

                  className="primary"

                  onClick={() => sendReply(selectedTicket.id)}

                  disabled={!reply.trim()}

                >

                  Send reply

                </button>

              </>

            ) : (

              <p className="muted">Loading ticket details...</p>

            )}

          </section>

        )}

        <footer>BookLeaf Publishing · Admin Support Console</footer>

      </main>

    );

  }

  return <main className="app-shell">

    <header className="topbar"><div className="brand"><span className="brand-mark small">B</span><div><strong>BookLeaf</strong><small>Author Support</small></div></div><div className="user-menu"><span>{user.name}</span><button className="ghost" onClick={logout}>Log out</button></div></header>

    <section className="welcome"><div><p className="eyebrow">AUTHOR DASHBOARD</p><h1>Welcome back, {user.name.split(" ")[0]}</h1><p className="muted">Your books, royalties, and support requests in one place.</p></div></section>

    <section className="stats">

      <article className="stat-card"><span>My books</span><strong>{books.length}</strong></article>

      <article className="stat-card"><span>Total royalty earned</span><strong>₹{books.reduce((n, b) => n + Number(b.total_royalty_earned || 0), 0).toLocaleString("en-IN")}</strong></article>

      <article className="stat-card"><span>Royalty pending</span><strong>₹{books.reduce((n, b) => n + Number(b.royalty_pending || 0), 0).toLocaleString("en-IN")}</strong></article>

      <article className="stat-card"><span>Open tickets</span><strong>{tickets.filter(t => !["Resolved", "Closed"].includes(t.status)).length}</strong></article>

    </section>

    {error && <p className="error banner">{error}</p>}{notice && <p className="success banner">{notice}</p>}

    <section className="panel"><div className="section-heading"><div><h2>My books</h2><p className="muted">Publication and royalty summary</p></div></div>

      {books.length ? <div className="table-wrap"><table><thead><tr><th>Title / ISBN</th><th>Status</th><th>MRP</th><th>Copies sold</th><th>Earned</th><th>Paid</th><th>Pending</th></tr></thead><tbody>

        {books.map(b => <tr key={b.book_id}><td><strong>{b.title}</strong><small>{b.isbn || "ISBN pending"}</small></td><td><span className={`status ${b.status.includes("Published") ? "published" : "production"}`}>{b.status}</span></td><td>{b.mrp == null ? "—" : `₹${Number(b.mrp).toLocaleString("en-IN")}`}</td><td>{b.total_copies_sold}</td><td>₹{Number(b.total_royalty_earned).toLocaleString("en-IN")}</td><td>₹{Number(b.royalty_paid).toLocaleString("en-IN")}</td><td>₹{Number(b.royalty_pending).toLocaleString("en-IN")}</td></tr>)}

      </tbody></table></div> : <p className="empty">No books found for this account.</p>}

    </section>

    
<section className="two-col">
  <section className="panel">
    <h2>Submit a support query</h2>
    <p className="muted">
      Tell our team what you need help with.
    </p>

    <form className="stack" onSubmit={submitTicket}>
      <label>
        Book
        <select
          value={bookId}
          onChange={(e) => setBookId(e.target.value)}
        >
          <option value="">General / Account Level</option>
          {books.map((b) => (
            <option value={b.book_id} key={b.book_id}>
              {b.title}
            </option>
          ))}
        </select>
      </label>

      <label>
        Subject
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          minLength="3"
          maxLength="160"
          required
          placeholder="Briefly describe your issue"
        />
      </label>

      <label>
        Description
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          minLength="10"
          maxLength="10000"
          rows="5"
          required
          placeholder="Share the details so we can help you..."
        />
      </label>

      <p className="hint">
        File attachment is not enabled in this starter version.
      </p>

      <button className="primary" type="submit">
        Submit ticket
      </button>
    </form>
  </section>

  <section className="panel">
    <h2>My tickets</h2>
    <p className="muted">
      View ticket status and replies from the support team.
    </p>

    {tickets.length > 0 ? (
      <div className="ticket-list">
        {tickets.map((t) => (
          <article className="ticket" key={t.id}>
            <div className="ticket-title">
              <strong>#{t.id} · {t.subject}</strong>
              <span
                className={`status ${
                  ["Resolved", "Closed"].includes(t.status)
                    ? "published"
                    : "production"
                }`}
              >
                {t.status}
              </span>
            </div>

            <p>{t.description}</p>

            <div className="ticket-meta">
              <span>{t.category}</span>
              <span>{t.priority} priority</span>
              <span>
                {t.created_at
                  ? new Date(t.created_at).toLocaleDateString()
                  : ""}
              </span>
            </div>

            <button
              type="button"
              className="ghost"
              onClick={() => toggleTicketConversation(t.id)}
            >
              {expandedTicketId === t.id
                ? "Hide conversation"
                : "View conversation"}
            </button>

            {expandedTicketId === t.id && (
              <div className="conversation">
                <h3>Conversation</h3>

                {(ticketMessages[t.id] || []).length > 0 ? (
                  ticketMessages[t.id].map((message) => (
                    <article className="ticket" key={message.id}>
                      <strong>
                        {message.sender_role === "admin"
                          ? "BookLeaf Support"
                          : "You"}
                      </strong>

                      <p>{message.body}</p>

                      <small className="muted">
                        {message.created_at
                          ? new Date(
                              message.created_at
                            ).toLocaleString()
                          : ""}
                      </small>
                    </article>
                  ))
                ) : (
                  <p className="empty">
                    No replies yet.
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
    ) : (
      <p className="empty">No support tickets yet.</p>
    )}

    <p className="muted">
      Updates refresh automatically every 8 seconds.
    </p>
  </section>
</section>


    <footer>BookLeaf Publishing · Author Support & Communication Portal</footer>

  </main>;

}

export default App;
