package com.ritma.android.today

import com.ritma.designsystem.AppointmentStatus
import java.time.DayOfWeek
import java.time.Duration
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.format.DateTimeFormatter
import java.util.Locale

val TrLocale: Locale = Locale.forLanguageTag("tr-TR")

enum class AppointmentState { Planned, Completed, Cancelled }

data class Appointment(
    val id: Int,
    val clientName: String,
    val date: LocalDate,
    val start: LocalTime,
    val end: LocalTime,
    val state: AppointmentState = AppointmentState.Planned,
) {
    /** `14:00–15:00` biçimi, en–tire ile. */
    val timeRange: String
        get() = "${start.format(TimeFormat)}–${end.format(TimeFormat)}"

    val startAt: LocalDateTime get() = LocalDateTime.of(date, start)
}

private val TimeFormat = DateTimeFormatter.ofPattern("HH:mm")
private val DayMonthFormat = DateTimeFormatter.ofPattern("d MMMM", TrLocale)

/** Seçili günün sıradaki planlı randevusu; yoksa null. */
fun nextAppointment(all: List<Appointment>, date: LocalDate): Appointment? =
    all.filter { it.date == date && it.state == AppointmentState.Planned }.minByOrNull { it.start }

private fun minutesUntil(a: Appointment, now: LocalDateTime): Long = Duration.between(now, a.startAt).toMinutes()

fun remainingText(a: Appointment, now: LocalDateTime): String {
    if (a.date != now.toLocalDate()) return a.date.format(DayMonthFormat)
    val min = minutesUntil(a, now)
    if (min <= 0) return "Şimdi"
    val h = min / 60
    val m = min % 60
    return when {
        h == 0L -> "$m dk kaldı"
        m == 0L -> "$h sa kaldı"
        else -> "$h sa $m dk kaldı"
    }
}

/** Başlangıca 15 dakika ya da daha az kalınca süre hapı caution rengine döner. */
fun isStartingSoon(a: Appointment, now: LocalDateTime): Boolean =
    a.date == now.toLocalDate() && minutesUntil(a, now) in 0..15

/** "Yaklaşıyor" yalnızca başlangıca 60 dakika ya da daha az kalmış planlı randevuda görünür. */
fun displayStatus(a: Appointment, now: LocalDateTime): AppointmentStatus = when (a.state) {
    AppointmentState.Completed -> AppointmentStatus.Completed
    AppointmentState.Cancelled -> AppointmentStatus.Cancelled
    AppointmentState.Planned ->
        if (a.date == now.toLocalDate() && minutesUntil(a, now) in 0..60) AppointmentStatus.Soon
        else AppointmentStatus.Planned
}

/** Hafta Pazartesi başlar. */
fun weekOf(date: LocalDate): List<LocalDate> {
    val monday = date.with(DayOfWeek.MONDAY)
    return (0..6).map { monday.plusDays(it.toLong()) }
}
