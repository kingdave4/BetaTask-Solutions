<template>
  <div class="tags-manager">
    <div class="manager-header">
      <h3>🏷️ Tags & Categories Manager</h3>
      <button @click="showAddForm = !showAddForm" class="toggle-form-btn">
        {{ showAddForm ? 'Cancel' : '+ Add New Tag' }}
      </button>
    </div>

    <!-- Add New Tag Form -->
    <div v-if="showAddForm" class="add-tag-form">
      <div class="form-row">
        <input
          v-model="newTagName"
          type="text"
          placeholder="Tag name (e.g., work, urgent, personal)"
          class="tag-input"
          @keyup.enter="addTag"
          maxlength="20"
        />
        <input
          v-model="newTagColor"
          type="color"
          class="color-picker"
          title="Choose tag color"
        />
        <button @click="addTag" :disabled="!newTagName.trim()" class="add-btn">
          Add Tag
        </button>
      </div>
      <p class="form-hint">Tags help organize your todos. Keep names short and descriptive.</p>
    </div>

    <!-- Predefined Categories -->
    <div class="categories-section">
      <h4>📁 Predefined Categories</h4>
      <div class="categories-grid">
        <div
          v-for="category in predefinedCategories"
          :key="category.id"
          class="category-item"
          :style="{ borderColor: category.color }"
        >
          <span class="category-icon">{{ category.icon }}</span>
          <span class="category-name">{{ category.name }}</span>
          <span class="category-count">({{ getCategoryCount(category.id) }})</span>
        </div>
      </div>
    </div>

    <!-- Custom Tags -->
    <div class="custom-tags-section">
      <h4>🏷️ Custom Tags</h4>
      <div v-if="customTags.length === 0" class="empty-state">
        <p>No custom tags yet. Create your first tag above!</p>
      </div>
      <div v-else class="tags-list">
        <div
          v-for="tag in customTags"
          :key="tag.id"
          class="tag-item"
        >
          <div class="tag-info">
            <span
              class="tag-color"
              :style="{ backgroundColor: tag.color }"
            ></span>
            <span class="tag-name">{{ tag.name }}</span>
            <span class="tag-count">({{ getTagCount(tag.id) }})</span>
          </div>
          <div class="tag-actions">
            <button @click="editTag(tag)" class="edit-btn" title="Edit tag">
              ✏️
            </button>
            <button @click="deleteTag(tag.id)" class="delete-btn" title="Delete tag">
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Tag Modal -->
    <div v-if="editingTag" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal-content">
        <h3>Edit Tag</h3>
        <div class="edit-form">
          <input
            v-model="editTagName"
            type="text"
            placeholder="Tag name"
            class="tag-input"
            maxlength="20"
          />
          <input
            v-model="editTagColor"
            type="color"
            class="color-picker"
          />
          <div class="modal-actions">
            <button @click="saveTagEdit" :disabled="!editTagName.trim()" class="save-btn">
              Save
            </button>
            <button @click="cancelEdit" class="cancel-btn">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useAuth } from '../composables/useAuth';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps({
  todos: {
    type: Array,
    default: () => []
  }
});

const { user, loading } = useAuth();

// Reactive data
const showAddForm = ref(false);
const newTagName = ref('');
const newTagColor = ref('#42b983');
const customTags = ref([]);
const editingTag = ref(null);
const editTagName = ref('');
const editTagColor = ref('');

// Predefined categories
const predefinedCategories = ref([
  { id: 'work', name: 'Work', icon: '💼', color: '#1e90ff' },
  { id: 'personal', name: 'Personal', icon: '👤', color: '#ff6b6b' },
  { id: 'home', name: 'Home', icon: '🏠', color: '#4ecdc4' },
  { id: 'shopping', name: 'Shopping', icon: '🛒', color: '#45b7d1' },
  { id: 'health', name: 'Health', icon: '🏥', color: '#96ceb4' },
  { id: 'finance', name: 'Finance', icon: '💰', color: '#feca57' },
  { id: 'education', name: 'Education', icon: '📚', color: '#ff9ff3' },
  { id: 'travel', name: 'Travel', icon: '✈️', color: '#54a0ff' }
]);

// Load custom tags
const loadCustomTags = () => {
  if (!user.value?.userId) return;
  
  const tagsRef = collection(db, 'tags');
  const q = query(tagsRef, where('userId', '==', user.value.userId));
  
  onSnapshot(q, (snapshot) => {
    const tags = [];
    snapshot.forEach((doc) => {
      tags.push({ id: doc.id, ...doc.data() });
    });
    customTags.value = tags;
  }, (error) => {
    console.error('Error loading tags:', error);
    if (error.code === 'permission-denied') {
      console.error('Permission denied: Check Firestore security rules for tags collection');
    }
  });
};

// Add new tag
const addTag = async () => {
  if (!newTagName.value.trim() || !user.value?.userId) return;
  
  try {
    const tagData = {
      name: newTagName.value.trim().toLowerCase(),
      color: newTagColor.value,
      userId: user.value.userId,
      createdAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'tags'), tagData);
    
    // Reset form
    newTagName.value = '';
    newTagColor.value = '#42b983';
    showAddForm.value = false;
  } catch (error) {
    console.error('Error adding tag:', error);
  }
};

// Edit tag
const editTag = (tag) => {
  editingTag.value = tag;
  editTagName.value = tag.name;
  editTagColor.value = tag.color;
};

// Save tag edit
const saveTagEdit = async () => {
  if (!editTagName.value.trim() || !editingTag.value) return;
  
  try {
    const tagRef = doc(db, 'tags', editingTag.value.id);
    await updateDoc(tagRef, {
      name: editTagName.value.trim().toLowerCase(),
      color: editTagColor.value
    });
    
    cancelEdit();
  } catch (error) {
    console.error('Error updating tag:', error);
  }
};

// Cancel edit
const cancelEdit = () => {
  editingTag.value = null;
  editTagName.value = '';
  editTagColor.value = '';
};

// Delete tag
const deleteTag = async (tagId) => {
  if (!confirm('Are you sure you want to delete this tag? It will be removed from all todos.')) {
    return;
  }
  
  try {
    await deleteDoc(doc(db, 'tags', tagId));
  } catch (error) {
    console.error('Error deleting tag:', error);
  }
};

// Get tag usage count
const getTagCount = (tagId) => {
  return props.todos.filter(todo => 
    todo.tags && (
      todo.tags.includes(tagId) || 
      todo.tags.some(tag => typeof tag === 'object' && tag.id === tagId)
    )
  ).length;
};

// Get category usage count
const getCategoryCount = (categoryId) => {
  return props.todos.filter(todo => todo.category === categoryId).length;
};

// Wait for authentication before loading tags
watch([() => user.value?.userId, loading], ([userId, isLoading]) => {
  if (!isLoading && userId) {
    loadCustomTags();
  }
}, { immediate: true });

onMounted(() => {
  // Only load if user is already authenticated
  if (user.value?.userId && !loading.value) {
    loadCustomTags();
  }
});

defineExpose({
  customTags,
  predefinedCategories
});
</script>

<style scoped>
.tags-manager {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.manager-header h3 {
  color: #333;
  margin: 0;
}

.toggle-form-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.toggle-form-btn:hover {
  background: #369870;
}

.add-tag-form {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
  border: 1px solid #e9ecef;
}

.form-row {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 10px;
}

.tag-input {
  flex: 1;
  padding: 8px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  color: #333;
}

.color-picker {
  width: 40px;
  height: 38px;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.add-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.add-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.form-hint {
  color: #666;
  font-size: 0.9em;
  margin: 0;
}

.categories-section,
.custom-tags-section {
  margin-bottom: 30px;
}

.categories-section h4,
.custom-tags-section h4 {
  color: #333;
  margin-bottom: 15px;
}

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.category-item {
  background: white;
  border: 2px solid;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.category-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.category-icon {
  font-size: 1.2em;
}

.category-name {
  flex: 1;
  color: #333;
  font-weight: 500;
}

.category-count {
  color: #666;
  font-size: 0.9em;
}

.tags-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tag-item {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tag-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tag-color {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #ddd;
}

.tag-name {
  color: #333;
  font-weight: 500;
}

.tag-count {
  color: #666;
  font-size: 0.9em;
}

.tag-actions {
  display: flex;
  gap: 8px;
}

.edit-btn,
.delete-btn {
  background: none;
  border: none;
  font-size: 1.1em;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background: #f8f9fa;
}

.delete-btn:hover {
  background: #f8d7da;
}

.empty-state {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 40px 20px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 30px;
  max-width: 400px;
  width: 90%;
  border: 1px solid #e9ecef;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.modal-content h3 {
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.save-btn {
  background: #42b983;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cancel-btn {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #5a6268;
}
</style> 