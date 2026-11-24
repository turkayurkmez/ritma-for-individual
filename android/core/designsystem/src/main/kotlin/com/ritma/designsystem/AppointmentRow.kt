package com.ritma.designsystem

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp

private val RowShape = RoundedCornerShape(20.dp)
private val AvatarShape = RoundedCornerShape(14.dp)

/** Aynı müşteri hep aynı pastel rengi alır. */
private fun avatarFace(name: String, c: RitmaColors): Color {
    val palette = listOf(c.highlight, c.info, c.primary, c.positive, c.caution, c.negative)
    return palette[Math.floorMod(name.hashCode(), palette.size)]
}

/** Tüm satır tek dokunma hedefidir; uzun basmak kısayol eylemini (tamamla) çalıştırır. */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun AppointmentRow(
    clientName: String,
    timeRange: String,
    status: AppointmentStatus,
    onClick: () -> Unit,
    onToggleDone: () -> Unit,
    modifier: Modifier = Modifier,
    semanticsText: String = "$clientName, $timeRange, ${status.label}",
) {
    val colors = RitmaTheme.colors
    val type = RitmaTheme.type
    val done = status == AppointmentStatus.Completed
    Row(
        modifier
            .fillMaxWidth()
            .alpha(if (status == AppointmentStatus.Cancelled) 0.7f else 1f)
            .padding(bottom = RitmaSize.lipCard)
            .lip(colors.edge, RitmaSize.lipCard, RowShape)
            .background(colors.surface, RowShape)
            .semantics(mergeDescendants = true) { contentDescription = semanticsText }
            .combinedClickable(role = Role.Button, onClick = onClick, onLongClick = onToggleDone)
            .heightIn(min = RitmaSize.touchTarget)
            .padding(RitmaSpace.s3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            Modifier.size(RitmaSize.avatar).background(avatarFace(clientName, colors), AvatarShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(clientName.take(1).uppercase(), style = type.title, color = colors.onPastel)
        }
        Column(Modifier.weight(1f).padding(horizontal = RitmaSpace.s3)) {
            Text(
                clientName,
                style = type.titleSm,
                color = colors.ink,
                textDecoration = if (done) TextDecoration.LineThrough else null,
            )
            Text(timeRange, style = type.bodyStrong, color = colors.inkMuted)
        }
        StatusChip(status)
    }
}
