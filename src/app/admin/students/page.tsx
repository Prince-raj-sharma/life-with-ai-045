"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { UserProfile } from "@/types";
import { formatDate } from "@/utils";
import {
  Users,
  Eye,
  Pencil,
  Trash2,
  Ban,
} from "lucide-react";

export default function AdminStudentsPage() {
  const { data: students, isLoading } = useQuery({
    queryKey: ["admin-students-list"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      const json = await res.json();
      return (json.stats?.recentRegistrations || []) as UserProfile[];
    },
  });

  const allStudents = students || [];
  const [selectedStudent, setSelectedStudent] = React.useState<UserProfile | null>(null);
  const [editingStudent, setEditingStudent] = React.useState<UserProfile | null>(null);
  const [editName, setEditName] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900">Enrolled Students Directory</h1>
        <p className="text-sm text-slate-600">View registered scholar accounts and active course permissions</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm p-6 sm:p-8">
        {isLoading ? (
          <div className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
        ) : allStudents.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-lg text-slate-700">No Registered Students</h3>
            <p className="text-xs text-slate-400">Students appear here once they register an account.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500 bg-slate-50">
                  <th className="p-4">Scholar Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Mobile Number</th>
                  <th className="p-4">Email Verified</th>
                  <th className="p-4">Enrolled Courses</th>
                  <th className="p-4">Registration Date</th>
                  <th className="p-4">Last Login</th>
                  <th className="p-4 text-right">Role</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {allStudents.map((s) => (
                  <tr key={s.uid} className="hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900 flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1D4ED8] flex items-center justify-center font-bold text-xs uppercase">
                        {s.displayName?.charAt(0) || "S"}
                      </div>
                      <span>{s.displayName}</span>
                    </td>
                    <td className="p-4 text-slate-600">{s.email}</td>
                    <td className="p-4 text-slate-600">{s.mobile || "—"}</td>
                    <td className="p-4">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        s.emailVerified
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {s.emailVerified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#1D4ED8] text-xs font-bold">
                        {s.purchasedCourses?.length || 0} Unlocked
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 text-xs">{formatDate(s.createdAt)}</td>
                    <td className="p-4 text-slate-500 text-xs">{s.lastLogin ? formatDate(s.lastLogin) : "—"}</td>
                    <td className="p-4 text-right">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                        {s.role}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">

                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                          title="View Student"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setEditingStudent(s);
                            setEditName(s.displayName);
                          }}
                          className="p-2 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200"
                          title="Edit Student"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch("/api/admin/students/block", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  uid: s.uid,
                                  blocked: !s.blocked,
                                }),
                              });

                              const data = await res.json();

                              if (data.success) {
                                alert(data.blocked ? "Student Blocked Successfully" : "Student Unblocked Successfully");
                                window.location.reload();
                              } else {
                                alert("Failed to update student.");
                              }
                            } catch (err) {
                              console.error(err);
                              alert("Something went wrong.");
                            }
                          }}
                          className={`p-2 rounded-lg ${
                            s.blocked
                              ? "bg-green-100 text-green-600 hover:bg-green-200"
                              : "bg-red-100 text-red-600 hover:bg-red-200"
                          }`}
                          title={s.blocked ? "Unblock Student" : "Block Student"}
                        >
                          <Ban className="w-4 h-4" />
                        </button>

                        <button
                          onClick={async () => {
                            const ok = window.confirm(
                              `Delete "${s.displayName}"?\n\nThis action cannot be undone.`
                            );

                            if (!ok) return;

                            try {
                              setDeleting(true);

                              const res = await fetch("/api/admin/students/delete", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  uid: s.uid,
                                }),
                              });

                              const data = await res.json();

                              if (data.success) {
                                alert("Student deleted successfully.");
                                window.location.reload();
                              } else {
                                alert(data.error || "Delete failed.");
                              }
                            } catch (err) {
                              console.error(err);
                              alert("Something went wrong.");
                            } finally {
                              setDeleting(false);
                            }
                          }}
                          disabled={deleting}
                          className="p-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-red-600 hover:text-white disabled:opacity-50"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedStudent(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStudent(null);
              }}

              className="absolute top-4 right-4 text-slate-500 hover:text-black text-xl"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6">
              Student Details
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500">Name</p>
                <p className="font-semibold">{selectedStudent.displayName}</p>
              </div>
        
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-semibold">{selectedStudent.email}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Mobile Number</p>
                <p className="font-semibold">{selectedStudent.mobile || "Not provided"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Email Verified</p>
                <p>{selectedStudent.emailVerified ? "Verified" : "Pending verification"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Registration Date</p>
                <p>{formatDate(selectedStudent.createdAt)}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Last Login</p>
                <p>{selectedStudent.lastLogin ? formatDate(selectedStudent.lastLogin) : "Not available"}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Role</p>
                <p>{selectedStudent.role}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500">Purchased Courses</p>

                {selectedStudent.purchasedCourses?.length ? (
                  <ul className="list-disc pl-5">
                    {selectedStudent.purchasedCourses.map((course, index) => (
                      <li key={index}>{course}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-red-500 font-medium">
                    No Course Purchased
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      {editingStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setEditingStudent(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setEditingStudent(null)}
              className="absolute top-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white border border-gray-300 shadow-md hover:bg-gray-100"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold mb-6 pr-12">
              Edit Student
            </h2>

            <label className="block text-sm font-semibold mb-2">
              Student Name
            </label>

            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 mb-6"
            />

            <button
              className="w-full bg-blue-600 text-white rounded-lg py-3 font-bold hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
