 
describe('Event Handling', () => {
  it('should trigger selection events on row click', () => {
    const memModel = createResourceWidthActivitiesData();
    const eventLog = [];
    const listener = {
      selectRows(rows, row) {
        eventLog.push({ event: 'selectRows', row, rows });
      },
      unselectRows(rows, row) {
        eventLog.push({ event: 'unselectRows', row, rows });
      },
      rowSelectionChanged(rows, row) {
        eventLog.push({ event: 'rowSelectionChanged', row, rows });
      }
    };

    return createGantt({ data: memModel, selection: listener }).then((gantt) => {
      const test = new GanttTest(gantt);
      test.clickRow(1);
      
      expect(eventLog).to.have.lengthOf(2);
      expect(eventLog[0].event).to.equal('selectRows');
      expect(eventLog[0].row.id).to.equal(gantt.getRow(1).id);
      expect(eventLog[1].event).to.equal('rowSelectionChanged');
      expect(eventLog[1].row.id).to.equal(gantt.getRow(1).id);
    });
  });

  it('should trigger selection events on activity click', () => {
    const memModel = createResourceWidthActivitiesData({
      getActivityCount(id, rowNum) {
        return 2;
      }
    });
    const eventLog = [];
    const listener = {
      selectActivities(activities, activity) {
        eventLog.push({ event: 'selectActivities', activity, activities });
      },
      unselectActivities(activities, activity) {
        eventLog.push({ event: 'unselectActivities', activity, activities });
      },
      activitySelectionChanged(activities, activity) {
        eventLog.push({ event: 'activitySelectionChanged', activity, activities });
      }
    };

    return createGantt({ data: memModel, selection: listener }).then((gantt) => {
      const test = new GanttTest(gantt);
      const act = gantt.getActivity(0, 1);
      test.clickActivity(0, 1);
      
      expect(eventLog).to.have.lengthOf(2);
      expect(eventLog[0].event).to.equal('selectActivities');
      expect(eventLog[0].activity.id).to.equal(act.id);
      expect(eventLog[1].event).to.equal('activitySelectionChanged');
      expect(eventLog[1].activity.id).to.equal(act.id);
    });
  });
});
