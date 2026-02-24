// ============================================================================
// School Dashboard Page — Real data from API
// ============================================================================
import { motion } from 'framer-motion';
import { useTenant } from '../../../../core/tenant';
import { Users, GraduationCap, School2, BarChart3, Plus, ClipboardList, FileText } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from '@erp/common';
import { useNavigate } from 'react-router-dom';
import { useGetDashboardStatsQuery } from '../../api/dashboardApi';

export default function DashboardPage() {
    const { tenant } = useTenant();
    const navigate = useNavigate();
    const today = new Date().toISOString().split('T')[0];

    const { data: statsData, isLoading: statsLoading } = useGetDashboardStatsQuery({ date: today });

    const stats = statsData?.data
        ? [
              {
                  title: 'Total Students',
                  value: statsData.data.totalStudents?.toLocaleString() ?? '—',
                  change: statsData.data.studentsChange ?? '',
                  changeType: 'positive' as const,
                  icon: Users,
                  iconBg: 'bg-blue-500/10',
                  iconColor: 'text-blue-500',
              },
              {
                  title: 'Total Teachers',
                  value: statsData.data.totalTeachers?.toLocaleString() ?? '—',
                  change: statsData.data.teachersChange ?? '',
                  changeType: 'positive' as const,
                  icon: GraduationCap,
                  iconBg: 'bg-green-500/10',
                  iconColor: 'text-green-500',
              },
              {
                  title: 'Total Classes',
                  value: statsData.data.totalClasses?.toLocaleString() ?? '—',
                  change: 'Active this semester',
                  changeType: 'neutral' as const,
                  icon: School2,
                  iconBg: 'bg-purple-500/10',
                  iconColor: 'text-purple-500',
              },
              {
                  title: 'Attendance Today',
                  value: statsData.data.attendanceRate != null
                      ? `${statsData.data.attendanceRate}%`
                      : '—',
                  change: statsData.data.attendanceRate != null
                      ? (statsData.data.attendanceRate >= 90 ? 'Above target' : 'Below target')
                      : 'No data yet',
                  changeType: (statsData.data.attendanceRate ?? 0) >= 90 ? 'positive' as const : 'neutral' as const,
                  icon: BarChart3,
                  iconBg: 'bg-orange-500/10',
                  iconColor: 'text-orange-500',
              },
          ]
        : null;

    const recentActivity = statsData?.data?.recentActivity ?? [];

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <FadeIn>
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">
                        Welcome to {tenant?.name || 'School'} Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Overview of your school's key metrics and activities
                    </p>
                </div>
            </FadeIn>

            {/* Stats Grid */}
            <StaggerContainer staggerDelay={0.1}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statsLoading
                        ? Array.from({ length: 4 }).map((_, i) => (
                              <div key={i} className="bg-card rounded-xl border border-border p-6 shadow-sm animate-pulse">
                                  <div className="h-4 bg-muted rounded w-24 mb-3" />
                                  <div className="h-8 bg-muted rounded w-16 mb-2" />
                                  <div className="h-3 bg-muted rounded w-32" />
                              </div>
                          ))
                        : stats
                        ? stats.map((stat, index) => (
                              <StaggerItem key={stat.title}>
                                  <motion.div
                                      whileHover={{ y: -4, boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)' }}
                                      className="bg-card rounded-xl border border-border p-6 shadow-sm cursor-pointer"
                                  >
                                      <div className="flex items-center justify-between">
                                          <div>
                                              <p className="text-sm text-muted-foreground">{stat.title}</p>
                                              <motion.p
                                                  initial={{ opacity: 0, scale: 0.5 }}
                                                  animate={{ opacity: 1, scale: 1 }}
                                                  transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
                                                  className="text-3xl font-bold text-foreground mt-1"
                                              >
                                                  {stat.value}
                                              </motion.p>
                                          </div>
                                          <div className={`h-12 w-12 ${stat.iconBg} rounded-xl flex items-center justify-center`}>
                                              <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                                          </div>
                                      </div>
                                      <p className={`text-xs mt-3 ${stat.changeType === 'positive' ? 'text-green-500' : 'text-muted-foreground'}`}>
                                          {stat.change}
                                      </p>
                                  </motion.div>
                              </StaggerItem>
                          ))
                        : (
                              <div className="col-span-4 text-center text-muted-foreground py-8">
                                  No data yet. Stats will appear once school data is available.
                              </div>
                          )}
                </div>
            </StaggerContainer>

            {/* Recent Activity and Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <FadeIn delay={0.3}>
                    <motion.div
                        whileHover={{ boxShadow: '0 10px 40px -15px rgba(0,0,0,0.1)' }}
                        className="bg-card rounded-xl border border-border p-6 shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
                        {statsLoading ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                                        <div className="h-10 w-10 bg-muted rounded-full" />
                                        <div className="flex-1">
                                            <div className="h-3 bg-muted rounded w-32 mb-1" />
                                            <div className="h-3 bg-muted rounded w-24" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : recentActivity.length > 0 ? (
                            <StaggerContainer staggerDelay={0.1}>
                                <div className="space-y-3">
                                    {recentActivity.map((activity: { icon?: string; title: string; subtitle?: string; color?: string }, index: number) => (
                                        <StaggerItem key={index}>
                                            <motion.div
                                                whileHover={{ x: 4 }}
                                                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                                            >
                                                <div className={`h-10 w-10 ${activity.color || 'bg-muted'} rounded-full flex items-center justify-center text-lg`}>
                                                    {activity.icon || '📋'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                                                    {activity.subtitle && (
                                                        <p className="text-xs text-muted-foreground">{activity.subtitle}</p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        </StaggerItem>
                                    ))}
                                </div>
                            </StaggerContainer>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No recent activity yet.</p>
                        )}
                    </motion.div>
                </FadeIn>

                {/* Quick Actions */}
                <FadeIn delay={0.4}>
                    <motion.div
                        whileHover={{ boxShadow: '0 10px 40px -15px rgba(0,0,0,0.1)' }}
                        className="bg-card rounded-xl border border-border p-6 shadow-sm"
                    >
                        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/admin/students/admit')}
                                className="p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors text-left group"
                            >
                                <Plus className="w-6 h-6 text-blue-500 mb-2" />
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Add Student</p>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/admin/attendance')}
                                className="p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors text-left group"
                            >
                                <ClipboardList className="w-6 h-6 text-green-500 mb-2" />
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Mark Attendance</p>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/admin/exams')}
                                className="p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors text-left group"
                            >
                                <FileText className="w-6 h-6 text-purple-500 mb-2" />
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Create Exam</p>
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigate('/admin/students')}
                                className="p-4 border border-border rounded-xl hover:bg-muted/50 transition-colors text-left group"
                            >
                                <Users className="w-6 h-6 text-orange-500 mb-2" />
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">View Students</p>
                            </motion.button>
                        </div>
                    </motion.div>
                </FadeIn>
            </div>
        </div>
    );
}
