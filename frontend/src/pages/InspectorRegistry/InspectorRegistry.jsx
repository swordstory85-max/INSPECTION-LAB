import { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../../config.js";

const emptyForm = { name: "", employee_id: "", contact: "" };

async function parseErrorMessage(response) {
  const body = await response.json().catch(() => null);
  return body?.errors?.length ? body.errors.join(", ") : `status ${response.status}`;
}

function InspectorRegistry() {
  const [inspectors, setInspectors] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function loadInspectors() {
    setLoadError("");
    fetch(`${API_BASE_URL}/registered-inspectors`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`목록을 불러오지 못했습니다 (status ${response.status})`);
        }
        return response.json();
      })
      .then((data) => {
        if (mountedRef.current) {
          setInspectors(data);
        }
      })
      .catch((err) => {
        if (mountedRef.current) {
          setLoadError(err.message);
        }
      });
  }

  useEffect(() => {
    loadInspectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function startEdit(inspector) {
    setEditingId(inspector.id);
    setForm({
      name: inspector.name,
      employee_id: inspector.employee_id,
      contact: inspector.contact,
    });
    setFormError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setFormError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setFormError("");
    try {
      const isEditing = editingId !== null;
      const response = await fetch(
        isEditing
          ? `${API_BASE_URL}/registered-inspectors/${editingId}`
          : `${API_BASE_URL}/registered-inspectors`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      cancelEdit();
      loadInspectors();
    } catch (error) {
      setFormError(error.message);
    } finally {
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }

  async function handleDelete(id) {
    if (deletingId !== null) {
      return;
    }

    setFormError("");
    setDeletingId(id);
    try {
      const response = await fetch(`${API_BASE_URL}/registered-inspectors/${id}`, {
        method: "DELETE",
      });
      if (!response.ok && response.status !== 204) {
        throw new Error(await parseErrorMessage(response));
      }
      if (editingId === id) {
        cancelEdit();
      }
      loadInspectors();
    } catch (error) {
      setFormError(error.message);
    } finally {
      if (mountedRef.current) {
        setDeletingId(null);
      }
    }
  }

  return (
    <div className="card">
      <h2>검사자 등록</h2>

      {loadError && <p className="error-text">{loadError}</p>}

      <form onSubmit={handleSubmit} className="toolbar">
        <label className="field">
          이름
          <input name="name" type="text" value={form.name} onChange={handleFieldChange} />
        </label>
        <label className="field">
          사번
          <input
            name="employee_id"
            type="text"
            value={form.employee_id}
            onChange={handleFieldChange}
          />
        </label>
        <label className="field">
          연락처
          <input
            name="contact"
            type="text"
            value={form.contact}
            onChange={handleFieldChange}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={isSaving}>
          {editingId !== null ? "수정 저장" : "등록"}
        </button>
        {editingId !== null && (
          <button type="button" className="btn" onClick={cancelEdit}>
            취소
          </button>
        )}
      </form>

      {formError && <p className="error-text">{formError}</p>}

      <div className="table-wrap mt-md">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>사번</th>
              <th>연락처</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {inspectors.map((inspector) => (
              <tr key={inspector.id}>
                <td>{inspector.name}</td>
                <td>{inspector.employee_id}</td>
                <td>{inspector.contact}</td>
                <td>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => startEdit(inspector)}
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleDelete(inspector.id)}
                    disabled={deletingId !== null}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {inspectors.length === 0 && !loadError && (
        <p className="empty-state">등록된 검사자가 없습니다.</p>
      )}
    </div>
  );
}

export default InspectorRegistry;
