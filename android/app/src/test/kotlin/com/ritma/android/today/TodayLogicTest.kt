package com.ritma.android.today

import com.ritma.designsystem.AppointmentStatus
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TodayLogicTest {
    private val day = LocalDate.of(2026, 11, 24)
    private val now = LocalDateTime.of(day, LocalTime.of(10, 0))

    private fun appt(id: Int, h: Int, m: Int = 0, state: AppointmentState = AppointmentState.Planned, date: LocalDate = day) =
        Appointment(id, "Müşteri $id", date, LocalTime.of(h, m), LocalTime.of(h + 1, m), state)

    @Test
    fun nextIsFirstPlannedByStartTime() {
        val list = listOf(appt(2, 14), appt(1, 11), appt(3, 9, state = AppointmentState.Completed))
        assertEquals(1, nextAppointment(list, day)?.id)
    }

    @Test
    fun nextSkipsCancelledAndCompleted() {
        val list = listOf(appt(1, 11, state = AppointmentState.Cancelled), appt(2, 12, state = AppointmentState.Completed))
        assertNull(nextAppointment(list, day))
    }

    @Test
    fun nextIgnoresOtherDays() {
        assertNull(nextAppointment(listOf(appt(1, 11, date = day.plusDays(1))), day))
    }

    @Test
    fun remainingTextCountsMinutesOrHours() {
        assertEquals("45 dk kaldı", remainingText(appt(1, 10, 45), now))
        assertEquals("2 sa kaldı", remainingText(appt(1, 12), now))
        assertEquals("1 sa 30 dk kaldı", remainingText(appt(1, 11, 30), now))
    }

    @Test
    fun remainingTextIsNowWhenStartedAndDateWhenAnotherDay() {
        assertEquals("Şimdi", remainingText(appt(1, 9, 30), now))
        assertEquals("25 Kasım", remainingText(appt(1, 9, date = day.plusDays(1)), now))
    }

    @Test
    fun pillTurnsCautionFifteenMinutesBefore() {
        assertEquals(true, isStartingSoon(appt(1, 10, 15), now))
        assertEquals(false, isStartingSoon(appt(1, 10, 16), now))
    }

    @Test
    fun statusIsSoonOnlyForPlannedWithinSixtyMinutes() {
        assertEquals(AppointmentStatus.Soon, displayStatus(appt(1, 10, 45), now))
        assertEquals(AppointmentStatus.Planned, displayStatus(appt(1, 11, 5), now))
        assertEquals(AppointmentStatus.Completed, displayStatus(appt(1, 10, 30, AppointmentState.Completed), now))
        assertEquals(AppointmentStatus.Cancelled, displayStatus(appt(1, 10, 30, AppointmentState.Cancelled), now))
    }

    @Test
    fun timeRangeUsesEnDash() {
        assertEquals("14:00–15:00", appt(1, 14).timeRange)
    }

    @Test
    fun weekStartsOnMonday() {
        assertEquals(LocalDate.of(2026, 11, 23), weekOf(day).first())
        assertEquals(7, weekOf(day).size)
    }
}
