package com.ritma.designsystem

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics

enum class ToolbarTarget(val description: String, val icon: ImageVector) {
    Today("Bugün", Icons.Filled.Home),
    Week("Hafta", Icons.Filled.DateRange),
    Clients("Müşteriler", Icons.Filled.Person),
    More("Daha fazla", Icons.Filled.MoreVert),
}

/** İki sekme, ortada ana eylem, iki sekme. Etiket yok; ikonlar TalkBack ile okunur. */
@Composable
fun FloatingToolbar(
    selected: ToolbarTarget,
    onSelect: (ToolbarTarget) -> Unit,
    onAdd: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = RitmaTheme.colors
    Row(
        modifier
            .fillMaxWidth()
            .height(RitmaSize.toolbarHeight)
            .background(colors.toolbar, CircleShape)
            .padding(horizontal = RitmaSpace.s2),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        Tab(ToolbarTarget.Today, selected, onSelect)
        Tab(ToolbarTarget.Week, selected, onSelect)
        RitmaButton("Randevu", onAdd, tone = Tone.Highlight, icon = Icons.Filled.Add)
        Tab(ToolbarTarget.Clients, selected, onSelect)
        Tab(ToolbarTarget.More, selected, onSelect)
    }
}

@Composable
private fun Tab(target: ToolbarTarget, selected: ToolbarTarget, onSelect: (ToolbarTarget) -> Unit) {
    val colors = RitmaTheme.colors
    val isSelected = target == selected
    Box(
        Modifier
            .size(RitmaSize.touchTarget)
            .background(if (isSelected) colors.primary else androidx.compose.ui.graphics.Color.Transparent, CircleShape)
            .semantics {
                contentDescription = target.description
                this.selected = isSelected
            }
            .clickable(role = Role.Tab) { onSelect(target) },
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            target.icon,
            contentDescription = null,
            tint = if (isSelected) colors.onPastel else colors.toolbarIcon,
            modifier = Modifier.size(RitmaSize.icon),
        )
    }
}
