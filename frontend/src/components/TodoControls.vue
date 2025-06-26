<template>
  <div class="controls-container">
    <div class="filter-controls">
      <span>Filter:</span>
      <button @click="filterModel = 'all'" :class="{ active: filterModel === 'all' }">All</button>
      <button @click="filterModel = 'incomplete'" :class="{ active: filterModel === 'incomplete' }">
        Incomplete
      </button>
      <button @click="filterModel = 'completed'" :class="{ active: filterModel === 'completed' }">
        Completed
      </button>
    </div>

    <!-- Category Filter -->
    <div class="category-filter">
      <span>Category:</span>
      <select v-model="categoryFilterModel" class="sort-select">
        <option value="">All Categories</option>
        <option v-for="category in predefinedCategories" :key="category.id" :value="category.id">
          {{ category.icon }} {{ category.name }}
        </option>
      </select>
    </div>

    <!-- Tag Filter -->
    <div class="tag-filter">
      <span>Tag:</span>
      <select v-model="tagFilterModel" class="sort-select">
        <option value="">All Tags</option>
        <option v-for="tag in availableTags" :key="tag.id" :value="tag.id">
          {{ tag.name }}
        </option>
      </select>
    </div>

    <div class="sort-controls">
      <span>Sort by:</span>
      <select v-model="sortByModel" class="sort-select">
        <option value="createdAt">Added Date</option>
        <option value="dueDate">Due Date</option>
        <option value="priority">Priority</option>
      </select>
      <select v-model="sortDirectionModel" class="sort-select">
        <option value="desc">Newest</option>
        <option value="asc">Oldest</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useAuth } from '../composables/useAuth';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const props = defineProps({
  currentFilter: {
    type: String,
    required: true,
  },
  categoryFilter: {
    type: String,
    default: ""
  },
  tagFilter: {
    type: String,
    default: ""
  },
  sortBy: {
    type: String,
    required: true,
  },
  sortDirection: {
    type: String,
    required: true,
  },
});

const emit = defineEmits([
  "update:currentFilter", 
  "update:categoryFilter", 
  "update:tagFilter", 
  "update:sortBy", 
  "update:sortDirection"
]);

const { user, loading } = useAuth();

const availableTags = ref([]);

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

// Computed models
const filterModel = computed({
  get: () => props.currentFilter,
  set: (value) => emit("update:currentFilter", value),
});

const categoryFilterModel = computed({
  get: () => props.categoryFilter,
  set: (value) => emit("update:categoryFilter", value),
});

const tagFilterModel = computed({
  get: () => props.tagFilter,
  set: (value) => emit("update:tagFilter", value),
});

const sortByModel = computed({
  get: () => props.sortBy,
  set: (value) => emit("update:sortBy", value),
});

const sortDirectionModel = computed({
  get: () => props.sortDirection,
  set: (value) => emit("update:sortDirection", value),
});

const loadAvailableTags = () => {
  if (!user.value?.userId) return;
  
  const tagsRef = collection(db, 'tags');
  const q = query(tagsRef, where('userId', '==', user.value.userId));
  
  onSnapshot(q, (snapshot) => {
    const tags = [];
    snapshot.forEach((doc) => {
      tags.push({ id: doc.id, ...doc.data() });
    });
    availableTags.value = tags;
  }, (error) => {
    console.error('Error loading tags in TodoControls:', error);
    if (error.code === 'permission-denied') {
      console.error('Permission denied: Check Firestore security rules for tags collection');
    }
  });
};

watch([() => user.value?.userId, loading], ([userId, isLoading]) => {
  if (!isLoading && userId) {
    loadAvailableTags();
  }
}, { immediate: true });

onMounted(() => {
  if (user.value?.userId && !loading.value) {
    loadAvailableTags();
  }
});
</script>

<style scoped>
.controls-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding: 15px 0px;
  font-size: 0.95em;
  flex-grow: 1;
  justify-content: flex-end;
}

.filter-controls,
.category-filter,
.tag-filter,
.sort-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.controls-container span {
  color: #aaa;
  margin-right: 5px;
}

.filter-controls button {
  padding: 6px 12px;
  border: 1px solid #555;
  background-color: transparent;
  color: #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
.filter-controls button:hover {
  background-color: #3a3a3a;
  border-color: #666;
}
.filter-controls button.active {
  background-color: #42b983;
  color: white;
  border-color: #42b983;
}

.sort-select {
  padding: 6px 10px;
  border: 1px solid #444;
  background-color: #333;
  color: #e0e0e0;
  border-radius: 4px;
  font-size: 0.95em;
  cursor: pointer;
}
</style>
