import type { RouteRecordRaw } from 'vue-router'
import HomePage from './pages/HomePage.vue'
import GroupSchedulePage from './pages/GroupSchedulePage.vue'
import TeacherSchedulePage from './pages/TeacherSchedulePage.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/group/:groupId',
    name: 'group-schedule',
    component: GroupSchedulePage,
    props: true,
  },
  {
    path: '/teacher/:teacherId',
    name: 'teacher-schedule',
    component: TeacherSchedulePage,
    props: true,
  },
]

