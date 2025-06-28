<template>
  <div class="notes-container">
    <div class="notes-header">
      <h2>Notes</h2>
      <button @click="showNewNoteForm = true" class="btn-primary">New Note</button>
    </div>

    <!-- New Note Form -->
    <div v-if="showNewNoteForm" class="note-form">
      <input
        v-model="newNote.title"
        placeholder="Note Title"
        class="note-title-input"
      />
      <textarea
        v-model="newNote.content"
        placeholder="Write your note here..."
        class="note-content-input"
      ></textarea>
      <select v-model="newNote.linkedTaskId" class="note-task-select">
        <option value="">No linked task</option>
        <option v-for="task in tasks" :key="task.id" :value="task.id">
          {{ task.title }}
        </option>
      </select>
      <div class="note-actions">
        <button @click="createNote" class="btn-primary">Save</button>
        <button @click="cancelNewNote" class="btn-secondary">Cancel</button>
      </div>
    </div>

    <!-- Notes List -->
    <div class="notes-list">
      <div v-for="note in (Array.isArray(notes) ? notes.filter(n => n.id) : [])" :key="note.id" class="note-card">
        <div class="note-header">
          <h3>{{ note.title }}</h3>
          <div class="note-actions">
            <button @click="editNote(note)" class="btn-icon">✏️</button>
            <button @click="deleteNote(note.id)" class="btn-icon">🗑️</button>
          </div>
        </div>
        <p class="note-content">{{ note.content }}</p>
        <div v-if="note.linkedTaskId" class="note-linked-task">
          Linked to: {{ getTaskTitle(note.linkedTaskId) }}
        </div>
        <div class="note-date">
          Last updated: {{ formatDate(note.updatedAt) }}
        </div>
      </div>
    </div>

    <!-- Edit Note Modal -->
    <div v-if="editingNote" class="modal">
      <div class="modal-content">
        <h3>Edit Note</h3>
        <input
          v-model="editingNote.title"
          placeholder="Note Title"
          class="note-title-input"
        />
        <textarea
          v-model="editingNote.content"
          placeholder="Write your note here..."
          class="note-content-input"
        ></textarea>
        <select v-model="editingNote.linkedTaskId" class="note-task-select">
          <option value="">No linked task</option>
          <option v-for="task in tasks" :key="task.id" :value="task.id">
            {{ task.title }}
          </option>
        </select>
        <div class="modal-actions">
          <button @click="updateNote" class="btn-primary">Save</button>
          <button @click="cancelEdit" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../composables/useAuth';

const props = defineProps({
  tasks: {
    type: Array,
    required: true
  }
});

const { user } = useAuth();

const notes = ref([]);
const showNewNoteForm = ref(false);
const editingNote = ref(null);
const newNote = ref({
  title: '',
  content: '',
  linkedTaskId: ''
});

// Fetch notes using real-time listener
onMounted(() => {
  if (!user.value?.userId) {
    notes.value = [];
    return;
  }

  const notesCollectionRef = collection(db, "notes");
  const q = query(notesCollectionRef, where("userId", "==", user.value.userId));

  onSnapshot(q, (snapshot) => {
    const fetchedNotes = [];
    snapshot.forEach((doc) => {
      fetchedNotes.push({ id: doc.id, ...doc.data() });
    });
    notes.value = fetchedNotes;
  }, (err) => {
    console.error("Error fetching notes from Firestore:", err);
  });
});

const createNote = async () => {
  try {
    const newNoteId = uuidv4();
    const noteData = {
      id: newNoteId,
      title: newNote.value.title,
      content: newNote.value.content,
      linkedTaskId: newNote.value.linkedTaskId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId: user.value?.userId,
    };
    await addDoc(collection(db, "notes"), noteData);
    cancelNewNote();
  } catch (error) {
    console.error('Error creating note:', error);
  }
};

const updateNote = async () => {
  try {
    const noteRef = doc(db, "notes", editingNote.value.id);
    const updatedData = {
      title: editingNote.value.title,
      content: editingNote.value.content,
      linkedTaskId: editingNote.value.linkedTaskId || null,
      updatedAt: new Date().toISOString(),
    };
    await updateDoc(noteRef, updatedData);
    cancelEdit();
  } catch (error) {
    console.error('Error updating note:', error);
  }
};

const deleteNote = async (noteId) => {
  try {
    await deleteDoc(doc(db, "notes", noteId));
  } catch (error) {
    console.error('Error deleting note:', error);
  }
};

const editNote = (note) => {
  editingNote.value = { ...note };
};

const cancelEdit = () => {
  editingNote.value = null;
};

const cancelNewNote = () => {
  showNewNoteForm.value = false;
  newNote.value = {
    title: '',
    content: '',
    linkedTaskId: ''
  };
};

const getTaskTitle = (taskId) => {
  const task = props.tasks.find(t => t.id === taskId);
  return task ? task.title : 'Unknown Task';
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? 'No date available' : date.toLocaleDateString();
};
</script>

<style scoped>
.notes-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.notes-header h2 {
  color: #333;
  margin: 0;
}

.note-form {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid #e9ecef;
}

.note-title-input {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.note-content-input {
  width: 100%;
  min-height: 150px;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  box-sizing: border-box;
}

.note-task-select {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box;
}

.note-actions {
  display: flex;
  gap: 10px;
}

.notes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.note-card {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.note-header h3 {
  color: #333;
  margin: 0;
}

.note-content {
  margin-bottom: 10px;
  white-space: pre-wrap;
  color: #666;
}

.note-linked-task {
  font-size: 0.9em;
  color: #666;
  margin-bottom: 5px;
}

.note-date {
  font-size: 0.8em;
  color: #999;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
}

.modal-content h3 {
  color: #333;
  margin-top: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-primary {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-primary:hover {
  background: #45a049;
}

.btn-secondary {
  background: #f5f5f5;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  color: #333;
  transition: background-color 0.3s ease;
}

.btn-secondary:hover {
  background: #e9ecef;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.btn-icon:hover {
  background: #f8f9fa;
}
</style> 