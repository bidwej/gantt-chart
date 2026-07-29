/**
 * TreeTableImpl - Custom Vanilla JS Tree Grid implementation.
 *
 * ARCHITECTURAL DESIGN DECISIONS:
 * Why a custom table instead of standard IBM Carbon Components (React/Svelte DataTable)?
 *
 * 1. Framework Agnosticism: The core 'ibm-gantt-chart' package is written in pure vanilla JS/TS
 *    so it can be shared between Svelte and React wrapper packages. Standard Carbon Table components
 *    are framework-specific and cannot be shared natively.
 * 2. Scroll Synchronization: A Gantt chart requires absolute, pixel-perfect vertical scroll syncing
 *    between the left-side tree table and the right-side timeline panel. A custom DOM implementation
 *    gives us the low-level DOM control and event hook access necessary to achieve lag-free sync.
 * 3. Rendering Performance: Gantt charts often load thousands of rows. Bypassing React/Svelte
 *    Virtual DOM and component lifecycles for high-frequency scrolling and node toggles by directly
 *    manipulating DOM nodes is significantly faster and prevents rendering lags.
 * 4. Lightweight Tree Support: Native Carbon DataTables do not support nested hierarchical trees out
 *    of the box. Implementing tree expansion, collapsible parents, and indentation in 469 lines of
 *    vanilla JS is lightweight and self-contained.
 */

import TreeTable from './TreeTable';
import Gantt from '../core';

const ROW_ID_PREFIX = 'row_';

export default class TreeTableImpl extends TreeTable {
  constructor(gantt, node, config) {
    super(gantt, node, config);
    this.gantt = gantt;
    this.rowsByIds = {};
    this.rows = [];
    this.collapsedRows = [];
    this.rowFilter = null;
    this.setConfiguration(config);
    const syncSelection = () => this.syncSelectionClasses();
    gantt.selection.on(Gantt.events.ROW_SELECTED, syncSelection);
    gantt.selection.on(Gantt.events.ROW_UNSELECTED, syncSelection);
    gantt.selection.on(Gantt.events.ROW_SELECTION_CLEARED, syncSelection);
    gantt.selection.on(Gantt.events.ROW_SELECTION_CHANGED, syncSelection);
  }

  setConfiguration(config) {
    this.config = config;
  }

  setRows(rows) {
    this.rows = rows;
    this.rowsByIds = (rows && rows.byIds) || {};

    // Clear existing table
    while (this.node.firstChild) {
      this.node.removeChild(this.node.firstChild);
    }

    // Create table element
    const tableElt = document.createElement('table');
    tableElt.className = 'gantt-tree-table';
    tableElt.style.width = '100%';
    tableElt.style.borderCollapse = 'collapse';
    tableElt.style.fontFamily = 'inherit';

    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.style.borderBottom = '1px solid #e0e0e0';
    headerRow.style.display = 'flex';

    // Columns setup: first is empty title for row numbers, second is Name, rest are custom config columns
    const columns = [
      { title: '', width: '40px', isRowNumber: true },
      { title: 'Name', renderer: { text: 'name' }, isName: true },
      ...(this.config?.columns || [])
    ];

    columns.forEach((column) => {
      const th = document.createElement('th');
      th.textContent = column.title || '';
      th.style.padding = '8px 12px';
      th.style.backgroundColor = '#f4f4f4';
      th.style.color = '#161616';
      th.style.fontWeight = '600';
      th.style.fontSize = '13px';
      th.style.textAlign = 'left';
      th.style.borderRight = '1px solid #e0e0e0';
      if (column.width) {
        th.style.width = column.width;
        th.style.flex = `0 0 ${column.width}`;
      } else {
        th.style.flex = '1';
      }
      if (column.sortComparator) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => this.sortRows(column));
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    tableElt.appendChild(thead);

    // Create body
    this.tableBody = document.createElement('tbody');
    this.tableBody.style.display = 'block';
    this.tableBody.style.overflowY = 'hidden';
    this.tableBody.style.overflowX = 'hidden';
    this.tableBody.style.position = 'absolute';
    this.tableBody.style.left = '0';
    this.tableBody.style.right = '0';
    this.tableBody.style.bottom = '0';
    this.tableBody.style.top = '36px';

    // Add rows
    const renderRowContent = (row, tr) => {
      // Clear row
      while (tr.firstChild) {
        tr.removeChild(tr.firstChild);
      }

      tr.id = row.id;
      tr.style.display = 'flex';
      tr.style.alignItems = 'center';
      tr.style.borderBottom = '1px solid #e0e0e0';
      tr.style.height = `${this.config?.rowHeight || 32}px`;
      tr.style.fontSize = '13px';
      
      const isCollapsed = this.collapsedRows.includes(row.id);
      
      columns.forEach((column) => {
        const td = document.createElement('td');
        td.style.padding = '4px 12px';
        td.style.display = 'flex';
        td.style.alignItems = 'center';
        td.style.overflow = 'hidden';
        td.style.textOverflow = 'ellipsis';
        td.style.whiteSpace = 'nowrap';
        td.style.borderRight = '1px solid #e0e0e0';
        
        if (column.width) {
          td.style.width = column.width;
          td.style.flex = `0 0 ${column.width}`;
        } else {
          td.style.flex = '1';
        }

        if (column.isRowNumber) {
          td.textContent = String(row.index + 1);
          td.style.color = '#8d8d8d';
          td.style.justifyContent = 'center';
        } else if (column.isName) {
          td.className = 'hierarchy-control';
          // Tree structure indentation
          const depth = row.getAncestorsCount ? row.getAncestorsCount() : 0;
          const indent = document.createElement('div');
          indent.style.width = `${depth * 16}px`;
          indent.style.flexShrink = '0';
          td.appendChild(indent);

          // Caret button if row has children
          const hasChildren = row.children && row.children.length > 0;
          const caret = document.createElement('span');
          caret.style.display = 'inline-block';
          caret.style.width = '16px';
          caret.style.cursor = hasChildren ? 'pointer' : 'default';
          caret.style.marginRight = '4px';
          caret.style.fontSize = '10px';
          caret.style.userSelect = 'none';
          caret.style.color = '#525252';
          
          if (hasChildren) {
            caret.textContent = isCollapsed ? '▶' : '▼';
            caret.addEventListener('click', (e) => {
              e.stopPropagation();
              this.toggleCollapseRow(row);
            });
          } else {
            caret.textContent = '';
          }
          td.appendChild(caret);

          // Name label
          const label = document.createElement('span');
          label.textContent = row.name ?? '';
          td.appendChild(label);
        } else {
          const field = column.renderer?.text || 'name';
          const value = typeof field === 'function' ? field(row) : row[field];
          td.textContent = value ?? '';
        }
        tr.appendChild(td);
      });
    };

    if (rows && rows.length) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        row.index = i;
        const tr = document.createElement('tr');
        row.tr = tr;
        renderRowContent(row, tr);
        
        // Zebra striping
        if (i % 2 === 1) {
          tr.style.backgroundColor = '#f9f9f9';
        } else {
          tr.style.backgroundColor = '#ffffff';
        }
        
        this.tableBody.appendChild(tr);
      }
    }

    tableElt.appendChild(this.tableBody);
    this.node.appendChild(tableElt);

    // Setup click handlers
    this.tableBody.addEventListener('click', (e) => {
      const tr = e.target.closest('tr');
      if (tr) {
        const row = this.getRow(tr.id);
        if (row && this.gantt.selectionHandler) {
          this.gantt.selectionHandler.processClick(e, row);
        }
      }
    });

    // Dynamic filter and zebra striping logic
    this.filterChanged = () => {
      let visibleIndex = 0;
      (this.rows || []).forEach((row) => {
        if (!row.tr) return;
        const hiddenByCollapse = this.isRowCollapsed(row);
        const hiddenByFilter = this.isRowFiltered(row);
        
        if (hiddenByCollapse || hiddenByFilter) {
          row.tr.remove();
        } else {
          // Update contents (to refresh carets state)
          renderRowContent(row, row.tr);
          
          // Re-apply zebra striping on visible rows
          if (visibleIndex % 2 === 1) {
            row.tr.style.backgroundColor = '#f9f9f9';
          } else {
            row.tr.style.backgroundColor = '#ffffff';
          }
          
          this.tableBody.appendChild(row.tr);
          visibleIndex++;
        }
      });
    };
  }

  getRow(param) {
    if (typeof param === 'string' && param.startsWith(ROW_ID_PREFIX)) {
      const id = param.substring(ROW_ID_PREFIX.length);
      return this.rowsByIds[id];
    }
    if (param && param.id) {
      return this.rowsByIds[param.id];
    }
    if (typeof param === 'string') {
      return this.rowsByIds[param];
    }
    return this.rows && this.rows[param];
  }

  getRowCount() {
    return this.rows ? this.rows.length : 0;
  }

  getTableBody() {
    return this.tableBody;
  }

  getScrollableTable() {
    return this.tableBody;
  }

  getScrollableBody() {
    return this.tableBody;
  }

  getRows() {
    return this.rows || [];
  }

  getVisibleRows() {
    return (this.rows || []).filter((row) => !this.isRowFiltered(row) && !this.isRowCollapsed(row));
  }

  getFirstVisibleRow() {
    const visibleRows = this.getVisibleRows();
    const top = this.tableBody?.scrollTop || 0;
    return visibleRows[Math.min(Math.floor(top / this.getDefaultRowHeight()), visibleRows.length - 1)] || null;
  }

  getHeight() {
    return this.getVisibleRows().length * this.getDefaultRowHeight();
  }

  nextRow(row) {
    const rows = this.getVisibleRows();
    return rows[rows.indexOf(row) + 1] || null;
  }

  prevRow(row) {
    const rows = this.getVisibleRows();
    return rows[rows.indexOf(row) - 1] || null;
  }

  getRowAt(y) {
    const rows = this.getVisibleRows();
    return rows[Math.max(0, Math.floor(y / this.getDefaultRowHeight()))] || null;
  }

  getRowTop(row) {
    if (!row || !this.tableBody) return 0;
    const index = this.getVisibleRows().indexOf(row);
    const rowHeight = this.getDefaultRowHeight();
    return (index + 1) * rowHeight <= this.getViewportHeight() ? 0 : index * rowHeight;
  }

  draw() {
    // No-op for basic implementation
  }

  drawRows() {
    // No-op for basic implementation
  }

  deleteDrawCache() {
    // No-op for basic implementation
  }

  isRowVisible(param) {
    const row = this.getRow(param);
    return !!row && !this.isRowFiltered(row) && !this.isRowCollapsed(row);
  }

  filterChanged() {
    (this.rows || []).forEach((row) => {
      if (!row.tr) return;
      const hiddenByCollapse = this.isRowCollapsed(row);
      if (hiddenByCollapse) {
        row.tr.remove();
      } else {
        row.tr.style.display = this.isRowFiltered(row) ? 'none' : 'block';
        this.tableBody.appendChild(row.tr);
      }
    });
  }

  setRowFilter(filter) {
    this.rowFilter = filter;
  }

  isRowFiltered(row) {
    if (!row || !this.rowFilter || this.rowFilter.isEmpty()) return false;
    const accepts = (candidate) =>
      this.rowFilter.accept(candidate, [candidate.name ?? '', candidate.id ?? ''], this.rows.indexOf(candidate));
    if (accepts(row)) return false;
    return !(this.rows || []).some((candidate) => {
      let parent = candidate.parent;
      while (parent) {
        if (parent === row || parent.id === row.id) return accepts(candidate);
        parent = parent.parent;
      }
      return false;
    });
  }

  toggleCollapseRow(row, collapse) {
    if (!row) return;
    const index = this.collapsedRows.indexOf(row.id);
    const shouldCollapse = collapse === undefined ? index < 0 : collapse;
    if (shouldCollapse && index < 0) this.collapsedRows.push(row.id);
    if (!shouldCollapse && index >= 0) this.collapsedRows.splice(index, 1);
    this.filterChanged();
  }

  setHeaderHeight(height) {
    if (this.tableBody && height) {
      this.tableBody.style.top = `${height}px`;
    }
  }

  highlightRow(row, highlight) {
    if (row && row.tr) {
      if (highlight) {
        row.tr.classList.add('selected');
      } else {
        row.tr.classList.remove('selected');
      }
    }
  }

  syncSelectionClasses() {
    (this.rows || []).forEach((row) => row.tr?.classList.toggle('selected', !!row.selected));
  }

  expandParents(row) {
    let parent = this.getParent(row);
    while (parent) {
      const index = this.collapsedRows.indexOf(parent.id);
      if (index >= 0) this.collapsedRows.splice(index, 1);
      parent = this.getParent(parent);
    }
    this.filterChanged();
  }

  getDefaultRowHeight() {
    const row = this.tableBody?.firstElementChild;
    return row?.offsetHeight || 32;
  }

  getRowHeight(row) {
    return (
      Number.parseFloat(row?.tr?.style.height) ||
      row?.tr?.offsetHeight ||
      this.config?.rowHeight ||
      this.getDefaultRowHeight()
    );
  }

  setRowHeight(row, height) {
    if (row?.tr) row.tr.style.height = `${height}px`;
  }

  getViewportHeight() {
    let element = this.node;
    while (element) {
      const height = Number.parseFloat(element.style?.height);
      if (height > 100) return height;
      element = element.parentElement;
    }
    return 320;
  }

  getParent(row) {
    if (!row?.parent) return null;
    return typeof row.parent === 'object' ? row.parent : this.rowsByIds[row.parent];
  }

  isRowCollapsed(row) {
    let parent = this.getParent(row);
    while (parent) {
      if (this.collapsedRows.includes(parent.id)) return true;
      parent = this.getParent(parent);
    }
    return false;
  }

  sortRows(column) {
    const direction = column.__sortDirection === 'asc' ? 'desc' : 'asc';
    column.__sortDirection = direction;
    const comparator = column.sortComparator;
    const ordered = [];
    const appendFamily = (parent) => {
      const children = (this.rows || []).filter((row) => row.parent === parent || row.parent?.id === parent?.id);
      children.sort((a, b) => (direction === 'asc' ? comparator(a, b) : comparator(b, a)));
      children.forEach((child) => {
        ordered.push(child);
        appendFamily(child);
      });
    };
    const roots = (this.rows || []).filter((row) => !row.parent);
    roots.forEach((root) => {
      ordered.push(root);
      appendFamily(root);
    });
    if (ordered.length !== this.rows.length) return;
    this.rows = Object.assign(ordered, { byIds: this.rowsByIds });
    ordered.forEach((row, index) => {
      row.index = index;
      this.tableBody.appendChild(row.tr);
    });
    this.gantt.drawTimeTable?.(true);
  }

  destroy() {
    if (this.tableBody && this.tableBody.parentNode) {
      this.tableBody.parentNode.removeChild(this.tableBody);
    }
    while (this.node.firstChild) {
      this.node.removeChild(this.node.firstChild);
    }
  }
}
