package com.ritma.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

private val ChipShape = RoundedCornerShape(14.dp)
private val Tr: Locale = Locale.forLanguageTag("tr-TR")

/** Hafta Pazartesi başlar. Şerit sağa/sola kaydırılınca hafta değişir. */
@Composable
fun DayStrip(
    selectedDate: LocalDate,
    onSelect: (LocalDate) -> Unit,
    appointmentCount: (LocalDate) -> Int,
    modifier: Modifier = Modifier,
) {
    val colors = RitmaTheme.colors
    val monday = selectedDate.with(DayOfWeek.MONDAY)
    var drag by remember { mutableFloatStateOf(0f) }
    Row(
        modifier
            .fillMaxWidth()
            .pointerInput(selectedDate) {
                detectHorizontalDragGestures(
                    onDragStart = { drag = 0f },
                    onHorizontalDrag = { _, amount -> drag += amount },
                    onDragEnd = {
                        if (drag > 120f) onSelect(selectedDate.minusWeeks(1))
                        else if (drag < -120f) onSelect(selectedDate.plusWeeks(1))
                    },
                )
            },
        horizontalArrangement = Arrangement.spacedBy(RitmaSpace.s1),
    ) {
        (0..6).map { monday.plusDays(it.toLong()) }.forEach { day ->
            val selected = day == selectedDate
            val count = appointmentCount(day)
            val description = "${day.dayOfWeek.getDisplayName(TextStyle.FULL, Tr)} ${day.dayOfMonth} " +
                "${day.month.getDisplayName(TextStyle.FULL, Tr)}, $count randevu"
            Column(
                Modifier
                    .weight(1f)
                    .padding(bottom = RitmaSize.lipCard)
                    .lip(if (selected) colors.primaryLip else colors.edge, RitmaSize.lipCard, ChipShape)
                    .background(if (selected) colors.primary else colors.surface, ChipShape)
                    .semantics(mergeDescendants = true) {
                        contentDescription = description
                        this.selected = selected
                    }
                    .clickable(role = Role.Button) { onSelect(day) }
                    .height(RitmaSize.dayChip),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    day.dayOfWeek.getDisplayName(TextStyle.SHORT, Tr),
                    style = RitmaTheme.type.caption,
                    color = if (selected) colors.onPastel else colors.inkMuted,
                )
                Text(
                    day.dayOfMonth.toString(),
                    style = RitmaTheme.type.label,
                    color = if (selected) colors.onPastel else colors.ink,
                )
                Box(
                    Modifier
                        .padding(top = 2.dp)
                        .size(6.dp)
                        .background(if (count > 0) (if (selected) colors.onPastel else colors.primaryLip) else androidx.compose.ui.graphics.Color.Transparent, CircleShape),
                )
            }
        }
    }
}
