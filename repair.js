const fs = require('fs');

let content = fs.readFileSync('src/components/StudyHubContent.tsx', 'utf8');

let anchor = '<span style={{ color: "#fb923c", fontWeight: 600 }}>Add Assignment</span>\n                                  </motion.div>\n                                </div>\n                              </div>';

let pStart = content.indexOf(anchor);
if (pStart === -1) {
    console.log('Anchor not found!');
    process.exit(1);
}
pStart += anchor.length;

let endAnchor = '</AnimatePresence>\n                  </div>\n                )}\n              </div>\n            </motion.main>';

let pEnd = content.indexOf(endAnchor, pStart);
if (pEnd === -1) {
    console.log('End anchor not found!');
    process.exit(1);
}

let newContent = `

                              {/* PRACTICALS SECTION */}
                              <div>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                                  <p className="section-label" style={{ color: "#818cf8", marginBottom: 0 }}>Practicals</p>
                                </div>
                                <div className="notes-grid">
                                  {topicsList.filter(t => t.category === "practical").map((topic, index) => {
                                      const b = statusBadge(topic.status);
                                      const isActive = activeClassroomId === topic.classroom_id;
                                      return (
                                        <motion.div
                                          key={topic.classroom_id}
                                          initial={{ opacity: 0, y: 20 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.4, delay: index * 0.05 }}
                                          className={\`note-card \${isActive ? "active-topic" : ""}\`}
                                          onClick={() => handleTopicClick(topic)}
                                        >
                                          <div className="note-header">
                                            <div className="note-icon" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8", borderColor: "rgba(129,140,248,0.25)", boxShadow: "0 4px 12px rgba(129,140,248,0.15)" }}><FileText size={18} /></div>
                                            <h3 className="note-title">{topic.topic_name.replace(/\\s*\\(Shared by .*\\)$/, '')}</h3>
                                            <span className={\`note-badge \${b.cls}\`}>{b.icon}&nbsp;{b.label}</span>
                                          </div>
                                          <p className="note-desc">
                                            {topic.topic_name.match(/\\(Shared by (.*?)\\)$/) 
                                              ? <span style={{ color: "#818cf8", fontWeight: 500 }}>✨ Shared by {topic.topic_name.match(/\\(Shared by (.*?)\\)$/)?.[1]}</span>
                                              : topic.created_at
                                                ? \`📅 \${new Date(topic.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}\`
                                                : "Click to view practical instructions."}
                                          </p>
                                          <div className="note-footer">
                                            <div className="note-meta"><FileText size={12} /><span>PDF Available</span></div>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                              {topic.is_personal && (
                                                <button 
                                                  className="read-btn" 
                                                  style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}
                                                  onClick={(e) => { e.stopPropagation(); setShareResourceId(topic.classroom_id); setShareTheme("#818cf8"); }}
                                                >
                                                  <Share2 size={13} /> Share
                                                </button>
                                              )}
                                              <button className="read-btn">Open <ChevronRight size={13} /></button>
                                            </div>
                                          </div>
                                        </motion.div>
                                      );
                                    })
                                  }
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={() => setAddCategory("practical")}
                                    style={{
                                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                      border: "2px dashed rgba(129,140,248,0.3)", background: "rgba(129,140,248,0.05)", cursor: "pointer",
                                      minHeight: "160px", gap: "12px", transition: "all 0.2s", borderRadius: "16px"
                                    }}
                                    whileHover={{ scale: 1.02, background: "rgba(129,140,248,0.1)", border: "2px dashed rgba(129,140,248,0.5)" }}
                                  >
                                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(129,140,248,0.15)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                      <PlusCircle size={24} />
                                    </div>
                                    <span style={{ color: "#818cf8", fontWeight: 600 }}>Add Practical</span>
                                  </motion.div>
                                </div>
                              </div>

                            </div>
                          ) : (
                            <div className="empty-state">
                              <div className="empty-state-icon"><Book size={32} /></div>
                              <h3>No Topics Yet</h3>
                              <p>Topics for this subject haven't been added yet. Check back later!</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </motion.main>`;

content = content.slice(0, pStart) + newContent + content.slice(pEnd + endAnchor.length);
fs.writeFileSync('src/components/StudyHubContent.tsx', content);
console.log('Successfully fixed file!');
