package com.ritma.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp

/** Durum renk, ikon ve sözcükle birlikte verilir; biri eksik olmaz. */
enum class AppointmentStatus(val label: String, val icon: ImageVector) {
    Planned("Planlandı", Icons.Filled.DateRange),
    Completed("Tamamlandı", Icons.Filled.Check),
    Cancelled("İptal", Icons.Filled.Close),
    Soon("Yaklaşıyor", Icons.Filled.Notifications);

    fun face(c: RitmaColors): Color = when (this) {
        Planned -> c.info
        Completed -> c.positive
        Cancelled -> c.negative
        Soon -> c.caution
    }
}

@Composable
fun StatusChip(status: AppointmentStatus, modifier: Modifier = Modifier) {
    val colors = RitmaTheme.colors
    Row(
        modifier
            .heightIn(min = 28.dp)
            .background(status.face(colors), CircleShape)
            .padding(horizontal = RitmaSpace.s3),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(status.icon, contentDescription = null, tint = colors.onPastel, modifier = Modifier.size(16.dp))
        Text(
            status.label,
            style = RitmaTheme.type.caption,
            color = colors.onPastel,
            modifier = Modifier.padding(start = RitmaSpace.s1),
        )
    }
}
