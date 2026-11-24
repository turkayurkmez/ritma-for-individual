package com.ritma.android.today

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.ritma.designsystem.AppointmentRow
import com.ritma.designsystem.FloatingToolbar
import com.ritma.designsystem.NextAppointmentCard
import com.ritma.designsystem.NextAppointmentEmpty
import com.ritma.designsystem.RitmaSpace
import com.ritma.designsystem.RitmaTheme
import com.ritma.designsystem.ToolbarTarget
import com.ritma.designsystem.DayStrip
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.delay

private val HeaderDate = DateTimeFormatter.ofPattern("d MMMM, EEEE", TrLocale)

@Composable
fun TodayScreen(initial: List<Appointment> = remember { sampleAppointments() }) {
    val colors = RitmaTheme.colors
    val type = RitmaTheme.type
    val appointments = remember { mutableStateListOf<Appointment>().apply { addAll(initial) } }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var sessionId by remember { mutableStateOf<Int?>(null) }
    var target by remember { mutableStateOf(ToolbarTarget.Today) }

    // Kalan süre dakikada bir güncellenir.
    var now by remember { mutableStateOf(LocalDateTime.now()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(60_000)
            now = LocalDateTime.now()
        }
    }

    fun setState(id: Int, state: AppointmentState) {
        val i = appointments.indexOfFirst { it.id == id }
        if (i >= 0) appointments[i] = appointments[i].copy(state = state)
    }

    val next = nextAppointment(appointments, selectedDate)
    val rest = appointments
        .filter { it.date == selectedDate && it.id != next?.id }
        .sortedBy { it.start }

    Box(Modifier.fillMaxSize().background(colors.bg).safeDrawingPadding()) {
        LazyColumn(
            contentPadding = PaddingValues(start = RitmaSpace.s4, end = RitmaSpace.s4, top = RitmaSpace.s4, bottom = 120.dp),
            verticalArrangement = Arrangement.spacedBy(RitmaSpace.s2),
        ) {
            item {
                Text(
                    if (selectedDate == LocalDate.now()) "Bugün" else "Seçili gün",
                    style = type.headline,
                    color = colors.ink,
                )
                Text(
                    selectedDate.format(HeaderDate),
                    style = type.bodySm,
                    color = colors.inkMuted,
                    modifier = Modifier.padding(bottom = RitmaSpace.s3),
                )
                DayStrip(
                    selectedDate = selectedDate,
                    onSelect = { selectedDate = it; sessionId = null },
                    appointmentCount = { d -> appointments.count { it.date == d } },
                )
            }
            item {
                Box(Modifier.padding(vertical = RitmaSpace.s2)) {
                    if (next != null) {
                        NextAppointmentCard(
                            clientName = next.clientName,
                            timeRange = next.timeRange,
                            remainingText = remainingText(next, now),
                            remainingSoon = isStartingSoon(next, now),
                            inSession = sessionId == next.id,
                            onStart = { sessionId = next.id },
                            onComplete = { setState(next.id, AppointmentState.Completed); sessionId = null },
                            onOpenNotes = {},
                        )
                    } else {
                        NextAppointmentEmpty(onAdd = {})
                    }
                }
            }
            if (rest.isNotEmpty()) {
                item { Text("Günün kalanı", style = type.titleSm, color = colors.ink) }
            }
            items(rest, key = { it.id }) { a ->
                AppointmentRow(
                    clientName = a.clientName,
                    timeRange = a.timeRange,
                    status = displayStatus(a, now),
                    onClick = {},
                    onToggleDone = {
                        if (a.state != AppointmentState.Cancelled) {
                            setState(a.id, if (a.state == AppointmentState.Completed) AppointmentState.Planned else AppointmentState.Completed)
                        }
                    },
                )
            }
        }
        FloatingToolbar(
            selected = target,
            onSelect = { target = it },
            onAdd = {},
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(start = RitmaSpace.s4, end = RitmaSpace.s4, bottom = RitmaSpace.s2),
        )
    }
}
