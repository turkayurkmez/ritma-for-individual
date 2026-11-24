package com.ritma.android.today

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

/**
 * Örnek veri (backend bağlanana kadar). Saatler şu ana göre kurulur ki ekran her açılışta
 * "sıradaki", "yaklaşıyor" ve "tamamlandı" durumlarını gösterebilsin.
 */
fun sampleAppointments(now: LocalDateTime = LocalDateTime.now()): List<Appointment> {
    val today = now.toLocalDate()
    // Gün sınırına taşmamak için başlangıç saati 02:00–16:00 aralığına çekilir (geç saatte randevular gerçek saatten öne kayar).
    fun at(offsetMinutes: Long): LocalTime {
        val base = now.toLocalTime().withSecond(0).withNano(0)
        val rounded = base.withMinute(if (base.minute < 30) 0 else 30)
        val anchor = (rounded.toSecondOfDay() / 60).coerceIn(2 * 60, 16 * 60)
        val minutes = anchor + offsetMinutes
        return LocalTime.of((minutes / 60).toInt(), (minutes % 60).toInt())
    }
    fun item(id: Int, name: String, offset: Long, state: AppointmentState = AppointmentState.Planned, date: LocalDate = today) =
        Appointment(id, name, date, at(offset), at(offset).plusHours(1), state)

    return listOf(
        item(1, "Zeynep Kaya", -120, AppointmentState.Completed),
        item(2, "Mehmet Aydın", 30),
        item(3, "Elif Demir", 120),
        item(4, "Can Yıldız", 240),
        item(5, "Selin Arslan", 300, AppointmentState.Cancelled),
        item(6, "Burak Şahin", 60, date = today.plusDays(1)),
        item(7, "Deniz Koç", 180, date = today.plusDays(1)),
        item(8, "Ayşe Polat", 90, date = today.plusDays(2)),
    )
}
