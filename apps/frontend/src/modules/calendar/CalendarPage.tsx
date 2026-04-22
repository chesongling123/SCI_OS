import { useState, useRef, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, DateSelectArg, EventDropArg } from '@fullcalendar/core';
import { Loader2 } from 'lucide-react';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '../../hooks/useEvents';
import ConfirmDialog from '../../components/ConfirmDialog';
import EventDialog from './EventDialog';
import type { CreateEventDto, EventResponseDto } from '@phd/shared-types';

/**
 * 颜色 → CSS 类名映射
 * 事件使用液态玻璃风格：低饱和半透明背景 + 左侧彩色色条
 */
const colorClassMap: Record<string, string> = {
  '#3b82f6': 'cal-event-blue',
  '#ef4444': 'cal-event-red',
  '#22c55e': 'cal-event-green',
  '#f59e0b': 'cal-event-yellow',
  '#a855f7': 'cal-event-purple',
  '#ec4899': 'cal-event-pink',
};

/**
 * 日程管理页面（Phase 1）
 * 集成 FullCalendar：日/周/月多视图、事件拖拽、点击创建
 * 视觉风格：液态玻璃（Liquid Glass）
 */
export default function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null);
  const { data: events, isLoading, error } = useEvents();
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const deleteMutation = useDeleteEvent();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogStart, setDialogStart] = useState('');
  const [dialogEnd, setDialogEnd] = useState('');
  const [editEvent, setEditEvent] = useState<EventResponseDto | null>(null);

  // 删除确认弹窗
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 将后端事件转为 FullCalendar 事件格式
  const fcEvents = (events ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    start: e.startAt,
    end: e.endAt,
    allDay: e.isAllDay,
    classNames: [colorClassMap[e.color ?? ''] ?? 'cal-event-blue'],
    extendedProps: {
      location: e.location,
      description: e.description,
      color: e.color,
    },
  }));

  // 点击日期/时间段创建事件
  const handleSelect = useCallback((selectInfo: DateSelectArg) => {
    setEditEvent(null);
    setDialogStart(selectInfo.startStr);
    setDialogEnd(selectInfo.endStr);
    setDialogOpen(true);
    selectInfo.view.calendar.unselect();
  }, []);

  // 点击已有事件编辑
  const handleEventClick = useCallback((clickInfo: EventClickArg) => {
    const backendEvent = events?.find((e) => e.id === clickInfo.event.id);
    if (backendEvent) {
      setEditEvent(backendEvent);
      setDialogOpen(true);
    }
  }, [events]);

  // 拖拽调整事件时间
  const handleEventDrop = useCallback((dropInfo: EventDropArg) => {
    updateMutation.mutate({
      id: dropInfo.event.id,
      dto: {
        startAt: dropInfo.event.start?.toISOString(),
        endAt: dropInfo.event.end?.toISOString(),
      },
    });
  }, [updateMutation]);

  const handleSubmit = (dto: CreateEventDto) => {
    if (editEvent) {
      updateMutation.mutate({ id: editEvent.id, dto });
    } else {
      createMutation.mutate(dto);
    }
  };

  const handleDelete = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (editEvent) {
      deleteMutation.mutate(editEvent.id);
      setDialogOpen(false);
      setEditEvent(null);
    }
    setConfirmOpen(false);
  }, [editEvent, deleteMutation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive">
        加载日程失败：{error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">日程管理</h1>
          <p className="text-muted-foreground text-sm mt-1">
            点击时间段创建事件，拖拽调整时间
          </p>
        </div>
        <div className="flex gap-2">
          <NavButton onClick={() => calendarRef.current?.getApi().prev()}>上月</NavButton>
          <NavButton onClick={() => calendarRef.current?.getApi().today()}>今天</NavButton>
          <NavButton onClick={() => calendarRef.current?.getApi().next()}>下月</NavButton>
        </div>
      </div>

      {/* FullCalendar — 玻璃风格容器 */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(12px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
          border: '1px solid var(--glass-border)',
          borderTopColor: 'var(--glass-border-highlight)',
          boxShadow: 'var(--glass-inset), var(--glass-shadow)',
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'title',
            center: '',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          events={fcEvents}
          selectable={true}
          selectMirror={true}
          editable={true}
          eventDrop={handleEventDrop}
          select={handleSelect}
          eventClick={handleEventClick}
          height="auto"
          locale="zh-cn"
          firstDay={1}
          buttonText={{
            today: '今天',
            month: '月',
            week: '周',
            day: '日',
          }}
          titleFormat={{ year: 'numeric', month: 'long' }}
          dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
          slotMinTime="07:00:00"
          slotMaxTime="23:00:00"
          allDaySlot={true}
          allDayText="全天"
          nowIndicator={true}
          dayMaxEvents={3}
          eventDisplay="block"
          eventTimeFormat={{
            hour: 'numeric',
            minute: '2-digit',
            meridiem: false,
          }}
          moreLinkContent={(args) => `+${args.num} 更多`}
          navLinks={false}
          weekNumbers={false}
          fixedWeekCount={false}
          showNonCurrentDates={true}
        />
      </div>

      {/* 创建/编辑弹窗 */}
      <EventDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditEvent(null); }}
        onSubmit={handleSubmit}
        initialStart={dialogStart}
        initialEnd={dialogEnd}
        editEvent={editEvent}
      />

      {/* 编辑模式下显示删除按钮 */}
      {dialogOpen && editEvent && (
        <div className="fixed bottom-6 right-6 z-[90]">
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors shadow-lg"
            style={{ background: 'oklch(0.55 0.15 25)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.6 0.16 25)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.55 0.15 25)'; }}
          >
            删除事件
          </button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="删除事件"
        description={`确定要删除「${editEvent?.title ?? ''}」吗？删除后无法恢复。`}
        confirmText="删除"
        destructive
      />
    </div>
  );
}

/** 自定义导航按钮 — 玻璃风格 */
function NavButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
      style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        color: 'var(--text-secondary)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: 'var(--glass-inset)',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg-hover)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border-highlight)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = 'var(--glass-bg)';
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--glass-border)';
        (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
      }}
    >
      {children}
    </button>
  );
}
